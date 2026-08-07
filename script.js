const WORKER_URL = "https://my-password-check.minecraftpesok.workers.dev/";

let currentImageBase64 = null;
let currentNotesList = []; 
let activeCategory = "all";
let activeSort = "newest"; 
let noteIdToDelete = null;

// ==========================================
// ПРОФИЛЬ (НИК + АВАТАРКА)
// ==========================================
const PROFILE_STORAGE_KEY = "archiveUserProfile";
const DEFAULT_AVATAR = "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <defs><clipPath id="c"><circle cx="100" cy="100" r="100"/></clipPath></defs>
        <g clip-path="url(#c)">
            <rect width="200" height="200" fill="#cbd5e1"/>
            <circle cx="100" cy="80" r="38" fill="#f8fafc"/>
            <ellipse cx="100" cy="196" rx="72" ry="70" fill="#f8fafc"/>
        </g>
    </svg>`
);
let selectedAvatar = DEFAULT_AVATAR;

function getProfile() {
    try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.name) return { name: parsed.name, avatar: parsed.avatar || DEFAULT_AVATAR };
        return null;
    } catch (e) {
        return null;
    }
}

function updateGamesTopUserInfo() {
    const profile = getProfile();
    const avatarEl = document.getElementById("gamesUserAvatar");
    const nameEl = document.getElementById("gamesUserName");
    if (avatarEl) avatarEl.src = profile ? profile.avatar : DEFAULT_AVATAR;
    if (nameEl) nameEl.textContent = profile ? profile.name : "Гость";
}

function resizeAvatarImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const size = 160;
                const canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext("2d");
                const scale = Math.max(size / img.width, size / img.height);
                const w = img.width * scale;
                const h = img.height * scale;
                const x = (size - w) / 2;
                const y = (size - h) / 2;
                ctx.drawImage(img, x, y, w, h);
                resolve(canvas.toDataURL("image/jpeg", 0.85));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const dataUrl = await resizeAvatarImage(file);
        selectedAvatar = dataUrl;
        const preview = document.getElementById("avatarPreview");
        if (preview) preview.src = dataUrl;
    } catch (e) {
        showToast("❌ Не удалось загрузить фото", "error");
    }
}

function resetAvatarToDefault() {
    selectedAvatar = DEFAULT_AVATAR;
    const preview = document.getElementById("avatarPreview");
    if (preview) preview.src = DEFAULT_AVATAR;
}

function openProfileModal(closable) {
    const overlay = document.getElementById("profileOverlay");
    const title = document.getElementById("profileModalTitle");
    const subtitle = document.getElementById("profileModalSubtitle");
    const nameInput = document.getElementById("profileNameInput");
    const cancelBtn = document.getElementById("profileCancelBtn");
    const preview = document.getElementById("avatarPreview");
    if (!overlay) return;

    const existing = getProfile();

    if (title) title.textContent = closable ? "Твой профиль" : "Добро пожаловать!";
    if (subtitle) subtitle.textContent = closable
        ? "Можешь поменять ник или фото в любой момент"
        : "Придумай ник и при желании загрузи фото — это будет видно у твоих записей";
    if (nameInput) nameInput.value = existing ? existing.name : "";
    if (cancelBtn) cancelBtn.style.display = closable ? "block" : "none";

    selectedAvatar = existing ? existing.avatar : DEFAULT_AVATAR;
    if (preview) preview.src = selectedAvatar;

    overlay.onclick = closable ? (e) => { if (e.target === overlay) closeProfileModal(); } : null;

    const settingsDropdown = document.getElementById("settingsDropdown");
    if (settingsDropdown) settingsDropdown.classList.remove("active");

    overlay.classList.add("active");
}

function closeProfileModal() {
    const overlay = document.getElementById("profileOverlay");
    if (overlay) overlay.classList.remove("active");
}

async function saveProfile() {
    const nameInput = document.getElementById("profileNameInput");
    const name = nameInput ? nameInput.value.trim() : "";

    if (!name) {
        showToast("⚠️ Введи ник", "error");
        return;
    }

    const oldProfile = getProfile();
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ name, avatar: selectedAvatar }));
    
    // Обновляем отображение аватарок в карточках локально
    if (oldProfile) {
        currentNotesList.forEach(note => {
            if (note.author_name === oldProfile.name || !note.author_name) {
                note.author_name = name;
                note.author_avatar = selectedAvatar;
            }
        });
        applyFiltersAndRender();
    }

    // Синхронизация с сервером
    try {
        await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                action: "update_profile",
                name: name,
                avatar: selectedAvatar
            })
        });
    } catch (e) {}

    updateGamesTopUserInfo();
    closeProfileModal();
    showToast("✅ Профиль сохранён");
}

function ensureProfileSetup() {
    if (!getProfile()) {
        openProfileModal(false);
    } else {
        updateGamesTopUserInfo();
    }
}

// Авторизация
async function login() {
    let passwordInput = document.getElementById("password");
    let message = document.getElementById("message");
    if (!passwordInput || !message) return;

    let password = passwordInput.value;
    message.innerHTML = "Проверка...";
    message.style.color = "#ffffff";

    try {
        let response = await fetch(WORKER_URL + "login", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ password: password }),
            credentials: "include"
        });

        if (response.ok) {
            message.innerHTML = "✅ Пароль верный";
            message.style.color = "#4ade80";
            document.getElementById("login").style.display = "none";
            document.getElementById("content").style.display = "flex";
            loadNotes();
            connectNotesSocket();
            ensureProfileSetup();
        } else if (response.status === 429) {
            let data = {};
            try { data = await response.json(); } catch (_) {}
            const mins = data.retry_after ? Math.ceil(data.retry_after / 60) : 15;
            message.innerHTML = `⏳ Слишком много попыток. Подождите ~${mins} мин.`;
            message.style.color = "#fbbf24";
        } else {
            message.innerHTML = "❌ Неверный пароль";
            message.style.color = "#f87171";
        }
    } catch (e) {
        message.innerHTML = "❌ Ошибка соединения";
        message.style.color = "#f87171";
    }
}

// Инициализация при загрузке документа
document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", login);
    }

    const passwordInput = document.getElementById("password");
    if (passwordInput) {
        passwordInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") login();
        });
    }

    const savedTheme = localStorage.getItem("site_theme");
    if (savedTheme) {
        if (savedTheme === "default") {
            document.documentElement.removeAttribute("data-theme");
        } else {
            document.documentElement.setAttribute("data-theme", savedTheme);
        }
    }

    const menuBtn = document.getElementById("settingsMenuBtn");
    const dropdown = document.getElementById("settingsDropdown");

    if (menuBtn && dropdown) {
        menuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const willOpen = !dropdown.classList.contains("active");
            dropdown.classList.toggle("active");
            if (willOpen) updateActiveThemeMark();
        });

        document.addEventListener("click", () => {
            dropdown.classList.remove("active");
            const sortMenu = document.getElementById("sortMenu");
            const sortTrigger = document.getElementById("sortTrigger");
            if (sortMenu) sortMenu.classList.remove("active");
            if (sortTrigger) sortTrigger.classList.remove("open");
        });

        dropdown.addEventListener("click", (e) => {
            e.stopPropagation();
        });
    }
});

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    const fileNameSpan = document.getElementById("fileName");
    if (file && fileNameSpan) {
        fileNameSpan.innerText = "Файл: " + file.name;
    }
}

// Сохранение записи
async function saveNote() {
    let title = document.getElementById("title").value;
    let content = document.getElementById("contentInput").value;
    let robloxUrl = document.getElementById("robloxUrl") ? document.getElementById("robloxUrl").value.trim() : "";
    let isPinned = document.getElementById("isPinned") ? document.getElementById("isPinned").checked : false;
    let imageInput = document.getElementById("imageInput");

    let categoryRadio = document.querySelector('input[name="category"]:checked');
    let category = categoryRadio ? categoryRadio.value : "Заметки";

    if (!title || !content) {
        alert("Заполните заголовок и текст!");
        return;
    }

    let id = document.getElementById("title").dataset.id;
    let action = id ? "edit" : "save";

    let imageBase64 = currentImageBase64;
    if (imageInput && imageInput.files[0]) {
        imageBase64 = await getBase64(imageInput.files[0]);
    }

    const profile = getProfile();

    let body = {
        action: action,
        title: title,
        content: content,
        category: category,
        roblox_url: robloxUrl,
        image: imageBase64,
        is_pinned: isPinned,
        author_name: profile ? profile.name : "Аноним",
        author_avatar: profile ? profile.avatar : DEFAULT_AVATAR
    };

    if (id) body.id = id;

    try {
        let response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body),
            credentials: "include"
        });

        if (response.ok) {
            const wasEdit = !!id;
            resetForm();
            loadNotes();
            showToast(wasEdit ? "✅ Запись обновлена" : "✅ Запись сохранена");
        } else {
            showToast("❌ Ошибка сохранения", "error");
        }
    } catch (err) {
        console.error("Ошибка при сохранении:", err);
        showToast("❌ Ошибка соединения", "error");
    }
}

// Загрузка записей
async function loadNotes() {
    try {
        let response = await fetch(WORKER_URL, {
            method: "GET",
            credentials: "include"
        });
        if (response.ok) {
            const freshNotes = await response.json();
            const hasChanged = JSON.stringify(freshNotes) !== JSON.stringify(currentNotesList);
            currentNotesList = freshNotes;
            if (hasChanged) {
                applyFiltersAndRender();
            }
        }
    } catch (err) {
        console.error("Ошибка загрузки:", err);
    }
}

function getNoteTimestamp(note) {
    if (note.created_at) return Number(note.created_at);
    return Number(note.id) || 0;
}

function formatNoteDate(note) {
    const ts = getNoteTimestamp(note);
    if (!note.created_at && ts < 1000000000) return "дата неизвестна";
    const d = new Date(ts * 1000);
    if (isNaN(d.getTime())) return "дата неизвестна";
    return d.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function applyFiltersAndRender() {
    let filtered = currentNotesList.slice();
    if (activeCategory !== "all") {
        filtered = filtered.filter(n => (n.category || "Заметки") === activeCategory);
    }

    filtered.sort((a, b) => {
        const pinA = (a.is_pinned === 1 || a.is_pinned === true) ? 1 : 0;
        const pinB = (b.is_pinned === 1 || b.is_pinned === true) ? 1 : 0;
        if (pinA !== pinB) return pinB - pinA;

        const ta = getNoteTimestamp(a);
        const tb = getNoteTimestamp(b);
        return activeSort === "oldest" ? ta - tb : tb - ta;
    });

    renderNotes(filtered);
}

function toggleSortMenu(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById("sortMenu");
    const trigger = document.getElementById("sortTrigger");
    if (!menu) return;
    const open = menu.classList.toggle("active");
    if (trigger) trigger.classList.toggle("open", open);
}

function setSort(sort, event) {
    if (event) event.stopPropagation();
    activeSort = sort || "newest";

    document.querySelectorAll(".sort-option").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.sort === activeSort);
    });

    const label = document.getElementById("sortLabel");
    if (label) {
        label.textContent = activeSort === "oldest" ? "Сначала старые" : "Сначала новые";
    }

    const menu = document.getElementById("sortMenu");
    const trigger = document.getElementById("sortTrigger");
    if (menu) menu.classList.remove("active");
    if (trigger) trigger.classList.remove("open");

    const search = document.getElementById("search");
    if (search && search.value.trim()) {
        handleSearch();
    } else {
        applyFiltersAndRender();
    }
}

function handleSort() { setSort(activeSort); }

function setCategory(category, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    activeCategory = category || "all";

    document.querySelectorAll(".category-filters .filter-btn").forEach(btn => {
        const isActive = btn.getAttribute("data-category") === activeCategory;
        btn.classList.toggle("active", isActive);
    });

    const search = document.getElementById("search");
    if (search && search.value.trim()) {
        handleSearch();
    } else {
        applyFiltersAndRender();
    }
}

function filterCategory(category, event) { setCategory(category, event); }

function handleSearch() {
    let query = document.getElementById("search").value.toLowerCase().trim();
    let filtered = currentNotesList.slice();

    if (activeCategory !== "all") {
        filtered = filtered.filter(n => (n.category || "Заметки") === activeCategory);
    }

    if (query) {
        filtered = filtered.filter(n =>
            (n.title || "").toLowerCase().includes(query) ||
            (n.content || "").toLowerCase().includes(query)
        );
    }

    filtered.sort((a, b) => {
        const pinA = (a.is_pinned === 1 || a.is_pinned === true) ? 1 : 0;
        const pinB = (b.is_pinned === 1 || b.is_pinned === true) ? 1 : 0;
        if (pinA !== pinB) return pinB - pinA;
        const ta = getNoteTimestamp(a);
        const tb = getNoteTimestamp(b);
        return activeSort === "oldest" ? ta - tb : tb - ta;
    });

    renderNotes(filtered);
}

function copyToClipboard(text, buttonEl) {
    navigator.clipboard.writeText(text).then(() => {
        let originalText = buttonEl.innerText;
        buttonEl.innerText = "✅ Скопировано!";
        setTimeout(() => { buttonEl.innerText = originalText; }, 1500);
    }).catch(err => console.error("Ошибка копирования: ", err));
}

function copyModalContent() {
    let text = document.getElementById("modalText").innerText;
    let btn = document.getElementById("btnModalCopy");
    
    navigator.clipboard.writeText(text).then(() => {
        let orig = btn.innerHTML;
        btn.innerHTML = "✅ Скопировано!";
        setTimeout(() => { btn.innerHTML = orig; }, 1500);
    });
}

function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderNotes(notes) {
    let output = "";

    notes.forEach(note => {
        const isPinned = note.is_pinned === 1 || note.is_pinned === true;
        const categoryName = note.category || "Заметки";

        const safeTitle = escapeHtml(note.title);
        const safeContent = escapeHtml(note.content);
        const safeImage = (note.image && note.image.startsWith("data:image/"))
            ? note.image
            : null;

        output += `
        <div class="note-card ${isPinned ? 'pinned' : ''}" onclick="openNoteModal(${note.id})">
            ${isPinned ? '<div class="pin-badge">📌 Закреплено</div>' : ''}
            
            <span class="category-badge">${categoryName === 'Скрипты' ? '📜 Скрипты' : '📝 Заметки'}</span>

            <h3 class="note-title">${safeTitle}</h3>
            <div class="note-content">${safeContent}</div>

            ${safeImage ? `
                <div class="note-image-container">
                    <img src="${safeImage}" class="note-image" alt="Фото">
                </div>
            ` : ""}

            <div class="note-date">🕒 ${formatNoteDate(note)}</div>
            <div class="note-footer">
                <div class="note-author">
                    <img class="note-author-avatar" src="${note.author_avatar || DEFAULT_AVATAR}" alt="" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}'">
                    <span class="note-author-name">${escapeHtml(note.author_name || "Аноним")}</span>
                </div>
                <div class="note-actions">
                    <button class="btn-action btn-copy" onclick="event.stopPropagation(); copyNoteById(${note.id}, this)">
                        📋 Копировать
                    </button>
                    <button class="btn-action btn-pin ${isPinned ? 'active' : ''}" onclick="event.stopPropagation(); togglePin(${note.id}, ${!isPinned})">
                        ${isPinned ? '📌' : '📍'}
                    </button>
                    <button class="btn-action btn-edit" onclick="event.stopPropagation(); editNote(${note.id})">
                        ✏️
                    </button>
                    <button class="btn-action btn-delete" onclick="event.stopPropagation(); deleteNote(${note.id})">
                        🗑
                    </button>
                </div>
            </div>
        </div>
        `;
    });

    const notesEl = document.getElementById("notes");
    if (!output) {
        notesEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <div class="empty-title">Пока пусто</div>
                <div class="empty-text">Добавь первую запись или сбрось поисковые фильтры</div>
            </div>
        `;
    } else {
        notesEl.innerHTML = output;
    }
}

function copyNoteById(id, buttonEl) {
    const note = currentNotesList.find(n => n.id == id);
    if (!note) return;
    copyToClipboard(note.content, buttonEl);
}

function openNoteModal(id) {
    let note = currentNotesList.find(n => n.id == id);
    if (!note) return;

    document.getElementById("modalTitle").innerText = note.title;
    document.getElementById("modalText").innerText = note.content;

    let dateEl = document.getElementById("modalDate");
    if (!dateEl) {
        dateEl = document.createElement("div");
        dateEl.id = "modalDate";
        dateEl.className = "modal-date";
        const modalRight = document.querySelector(".modal-right");
        if (modalRight) modalRight.appendChild(dateEl);
    }
    dateEl.textContent = "🕒 " + formatNoteDate(note);

    let robloxContainer = document.getElementById("modalRobloxContainer");
    if (!robloxContainer) {
        robloxContainer = document.createElement("div");
        robloxContainer.id = "modalRobloxContainer";
        let modalTextEl = document.getElementById("modalText");
        modalTextEl.parentNode.insertBefore(robloxContainer, modalTextEl);
    }

    if (note.roblox_url && note.roblox_url.trim() !== "") {
        let raw = note.roblox_url.trim();
        let url = raw.match(/^https?:\/\//i) ? raw : "https://" + raw;
        robloxContainer.innerHTML = `
            <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="roblox-link-btn">
                📎 Открыть ссылку  
            </a>
        `;
    } else {
        robloxContainer.innerHTML = "";
    }

    let modalImg = document.getElementById("modalImage");
    let modalLeft = document.getElementById("modalLeft");

    if (note.image) {
        modalImg.src = note.image;
        modalLeft.style.display = "flex";
    } else {
        modalLeft.style.display = "none";
    }

    document.getElementById("modalOverlay").classList.add("active");
}

function editNote(id) {
    let note = currentNotesList.find(n => n.id == id);
    if (!note) return;

    document.getElementById("title").value = note.title;
    document.getElementById("contentInput").value = note.content;
    
    let robloxField = document.getElementById("robloxUrl");
    if (robloxField) robloxField.value = note.roblox_url || "";

    let catRadio = document.querySelector(`input[name="category"][value="${note.category || 'Заметки'}"]`);
    if (catRadio) catRadio.checked = true;

    let pinField = document.getElementById("isPinned");
    if (pinField) pinField.checked = note.is_pinned === 1 || note.is_pinned === true;

    document.getElementById("title").dataset.id = note.id;
    document.getElementById("formTitle").innerText = "Редактировать запись";
    document.getElementById("btnCancel").style.display = "block";

    currentImageBase64 = note.image;
}

function resetForm() {
    document.getElementById("title").value = "";
    document.getElementById("contentInput").value = "";
    let robloxField = document.getElementById("robloxUrl");
    if (robloxField) robloxField.value = "";

    let defRadio = document.querySelector('input[name="category"][value="Заметки"]');
    if (defRadio) defRadio.checked = true;

    let imgInput = document.getElementById("imageInput");
    if (imgInput) imgInput.value = "";
    let fileName = document.getElementById("fileName");
    if (fileName) fileName.innerText = "Выберите фото";
    let pinField = document.getElementById("isPinned");
    if (pinField) pinField.checked = false;
    
    delete document.getElementById("title").dataset.id;
    currentImageBase64 = null;

    document.getElementById("formTitle").innerText = "Новая запись";
    document.getElementById("btnCancel").style.display = "none";
}

async function togglePin(id, status) {
    try {
        await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "toggle_pin", id: id, is_pinned: status }),
            credentials: "include"
        });
        loadNotes();
        showToast(status ? "📌 Закреплено" : "📍 Откреплено");
    } catch (err) {
        showToast("❌ Не удалось изменить", "error");
    }
}

function openConfirmModal({ title, text, confirmLabel, onConfirm }) {
    const overlay = document.getElementById("confirmOverlay");
    const titleEl = document.getElementById("confirmTitle");
    const textEl = document.getElementById("confirmText");
    const confirmBtn = document.getElementById("btnConfirmAction");
    if (!overlay || !confirmBtn) return;

    if (titleEl) titleEl.textContent = title || "Подтверждение";
    if (textEl) textEl.textContent = text || "Вы уверены?";
    confirmBtn.textContent = confirmLabel || "Подтвердить";
    confirmBtn.onclick = () => {
        if (typeof onConfirm === "function") onConfirm();
    };
    overlay.classList.add("active");
}

function closeConfirmModal() {
    const overlay = document.getElementById("confirmOverlay");
    if (overlay) overlay.classList.remove("active");
    noteIdToDelete = null;
}

function deleteNote(id) {
    noteIdToDelete = id;
    openConfirmModal({
        title: "Удалить запись?",
        text: "Это действие нельзя будет отменить.",
        confirmLabel: "Удалить",
        onConfirm: confirmDelete
    });
}

async function confirmDelete() {
    if (!noteIdToDelete) return;
    try {
        await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", id: noteIdToDelete }),
            credentials: "include"
        });
        closeConfirmModal();
        loadNotes();
        showToast("🗑 Запись удалена");
    } catch (err) {
        showToast("❌ Ошибка удаления", "error");
    }
}

function closeModal() {
    document.getElementById("modalOverlay").classList.remove("active");
}

function updateActiveThemeMark() {
    const current = localStorage.getItem("site_theme") || "default";
    document.querySelectorAll(".settings-option[data-theme-value]").forEach(btn => {
        btn.classList.toggle("active-theme", btn.dataset.themeValue === current);
    });
}

function setTheme(themeName) {
    const html = document.documentElement;
    const dropdown = document.getElementById("settingsDropdown");

    if (themeName === "default") {
        html.removeAttribute("data-theme");
        localStorage.setItem("site_theme", "default");
    } else {
        html.setAttribute("data-theme", themeName);
        localStorage.setItem("site_theme", themeName);
    }

    updateActiveThemeMark();
    if (dropdown) dropdown.classList.remove("active");
}

// Автоматическая проверка сессии при открытии
document.addEventListener("DOMContentLoaded", async () => {
    const loginContainer = document.getElementById("login");
    const contentContainer = document.getElementById("content");

    try {
        let response = await fetch(WORKER_URL, {
            method: "GET",
            credentials: "include"
        });

        if (response.ok) {
            currentNotesList = await response.json();
            if (loginContainer) loginContainer.style.display = "none";
            if (contentContainer) contentContainer.style.display = "flex";
            applyFiltersAndRender();
            connectNotesSocket();
            ensureProfileSetup();
            showAutoLoginToast();
        } else {
            if (loginContainer) loginContainer.style.display = "block";
            if (contentContainer) contentContainer.style.display = "none";
        }
    } catch (error) {
        if (loginContainer) loginContainer.style.display = "block";
        if (contentContainer) contentContainer.style.display = "none";
    }
});

function showToast(message, type = "ok") {
    let toast = document.getElementById("appToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "appToast";
        toast.className = "toast-notification";
        toast.innerHTML = `
            <span class="toast-message"></span>
            <button class="toast-close" onclick="closeToast()">✕</button>
        `;
        document.body.appendChild(toast);
    }

    const msg = toast.querySelector(".toast-message");
    if (msg) msg.textContent = message;

    toast.classList.remove("toast-error", "toast-ok", "show");
    toast.classList.add(type === "error" ? "toast-error" : "toast-ok");

    void toast.offsetWidth;
    setTimeout(() => toast.classList.add("show"), 10);

    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => closeToast(), 3200);
}

function showAutoLoginToast() {
    showToast("💡 Пароль уже вводили — повторный вход не нужен");
}

function closeToast() {
    const toast = document.getElementById("appToast");
    if (toast) {
        toast.classList.remove("show");
        clearTimeout(window.toastTimer);
    }
}

function requestLogout() {
    const dropdown = document.getElementById("settingsDropdown");
    if (dropdown) dropdown.classList.remove("active");

    openConfirmModal({
        title: "Выйти из архива?",
        text: "Потребуется снова ввести пароль.",
        confirmLabel: "Выйти",
        onConfirm: logout
    });
}

// Полноценный запуск процесса выхода
async function logout() {
    closeConfirmModal();
    disconnectNotesSocket();

    try {
        await fetch(WORKER_URL + "logout", {
            method: "POST",
            credentials: "include"
        });
    } catch (_) {}

    document.getElementById("content").style.display = "none";
    document.getElementById("login").style.display = "block";
    const pass = document.getElementById("password");
    if (pass) pass.value = "";
    const msg = document.getElementById("message");
    if (msg) msg.innerHTML = "";
    currentNotesList = [];
    showToast("🚪 Вы вышли");
}

// ==========================================
// РЕАЛЬНОЕ ВРЕМЯ (Polling)
// ==========================================
const NOTES_POLL_INTERVAL_MS = 5000;
let notesPollTimer = null;

function connectNotesSocket() {
    if (notesPollTimer) return;
    notesPollTimer = setInterval(() => {
        const contentVisible = document.getElementById("content")?.style.display !== "none";
        if (document.visibilityState === "visible" && contentVisible) {
            loadNotes();
        }
    }, NOTES_POLL_INTERVAL_MS);
}

function disconnectNotesSocket() {
    if (notesPollTimer) {
        clearInterval(notesPollTimer);
        notesPollTimer = null;
    }
}

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        const contentVisible = document.getElementById("content")?.style.display !== "none";
        if (contentVisible) loadNotes();
    }
});

// ==========================================
// ПАНЕЛЬ МИНИ-ИГР
// ==========================================
function openGamesPanel() {
    const panel = document.getElementById("gamesPanel");
    const arrowBtn = document.getElementById("gamesArrowBtn");
    if (panel) panel.classList.add("active");
    if (arrowBtn) arrowBtn.classList.add("hidden");
    updateGamesTopUserInfo();
    loadLeaderboard();
    checkWheelCooldown();
}

function closeGamesPanel() {
    const panel = document.getElementById("gamesPanel");
    const arrowBtn = document.getElementById("gamesArrowBtn");
    if (panel) panel.classList.remove("active");
    if (arrowBtn) arrowBtn.classList.remove("hidden");
}

// ─── Колесо фортуны (Раз в 24 часа) ──────────────────────
const WHEEL_LAST_SPIN_KEY = "wheelLastSpinTimestamp";
const wheelSegments = [
    { label: "+50 🪙", type: "coin", value: 50 },
    { label: "😢 Пусто", type: "none", value: 0 },
    { label: "+200 🪙", type: "coin", value: 200 },
    { label: "⚡ Сброс КД", type: "cooldown", value: 0 },
    { label: "+10 🪙", type: "coin", value: 10 },
    { label: "🍀 Удача", type: "coin", value: 100 },
    { label: "+500 🪙", type: "coin", value: 500 },
    { label: "⭐ Джекпот", type: "coin", value: 1000 }
];
const wheelColors = ["#34d399", "#38bdf8", "#f472b6", "#fbbf24", "#a78bfa", "#fb7185", "#4ade80", "#f97316"];
let currentWheelRotation = 0;
let wheelSpinning = false;
let wheelTimerInterval = null;

function drawWheel() {
    const canvas = document.getElementById("wheelCanvas");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = canvas.width / 2 - 4;
    const segAngle = (2 * Math.PI) / wheelSegments.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    wheelSegments.forEach((seg, i) => {
        const start = i * segAngle;
        const end = start + segAngle;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, end);
        ctx.closePath();
        ctx.fillStyle = wheelColors[i % wheelColors.length];
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(start + segAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#10151f";
        ctx.font = "700 13px Inter, sans-serif";
        ctx.fillText(seg.label, radius - 12, 5);
        ctx.restore();
    });
}

function checkWheelCooldown() {
    const lastSpin = parseInt(localStorage.getItem(WHEEL_LAST_SPIN_KEY) || "0", 10);
    const now = Date.now();
    const cooldownMs = 24 * 60 * 60 * 1000;
    const btn = document.getElementById("wheelSpinBtn");
    const timerNote = document.getElementById("wheelTimerNote");

    if (now - lastSpin < cooldownMs) {
        if (btn) btn.disabled = true;
        startWheelTimer(cooldownMs - (now - lastSpin));
        return false;
    } else {
        if (btn) btn.disabled = false;
        if (timerNote) timerNote.textContent = "✨ Колесо готово к прокруту!";
        if (wheelTimerInterval) clearInterval(wheelTimerInterval);
        return true;
    }
}

function startWheelTimer(remainingMs) {
    if (wheelTimerInterval) clearInterval(wheelTimerInterval);
    const timerNote = document.getElementById("wheelTimerNote");
    
    function update() {
        if (remainingMs <= 0) {
            clearInterval(wheelTimerInterval);
            checkWheelCooldown();
            return;
        }
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);
        if (timerNote) {
            timerNote.textContent = `⏳ До следующего вращения: ${hours}ч ${mins}м ${secs}с`;
        }
        remainingMs -= 1000;
    }
    update();
    wheelTimerInterval = setInterval(update, 1000);
}

function spinWheel() {
    if (wheelSpinning) return;
    if (!checkWheelCooldown()) {
        showToast("⏳ Колесо будет доступно позже!", "error");
        return;
    }

    const canvas = document.getElementById("wheelCanvas");
    const resultEl = document.getElementById("wheelResult");
    const btn = document.getElementById("wheelSpinBtn");
    if (!canvas) return;

    wheelSpinning = true;
    if (btn) btn.disabled = true;
    if (resultEl) resultEl.textContent = "";

    const segAngle = 360 / wheelSegments.length;
    const winIndex = Math.floor(Math.random() * wheelSegments.length);
    const targetCenter = winIndex * segAngle + segAngle / 2;

    let needed = (270 - targetCenter) % 360;
    if (needed < 0) needed += 360;

    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const currentMod = ((currentWheelRotation % 360) + 360) % 360;
    currentWheelRotation += extraSpins * 360 + ((needed - currentMod) + 360) % 360;

    canvas.style.transform = `rotate(${currentWheelRotation}deg)`;

    setTimeout(() => {
        wheelSpinning = false;
        const prize = wheelSegments[winIndex];
        
        if (prize.type === "coin") {
            upgraderBalance += prize.value;
            saveUpgraderBalance();
            renderUpgraderBalance();
            checkUpgraderBest();
            if (resultEl) resultEl.textContent = `🎉 Награда: +${prize.value} 🪙!`;
        } else if (prize.type === "cooldown") {
            localStorage.removeItem(WHEEL_LAST_SPIN_KEY);
            if (resultEl) resultEl.textContent = "⚡ Кулдаун сброшен! Можно крутить ещё раз!";
            checkWheelCooldown();
            return;
        } else {
            if (resultEl) resultEl.textContent = "😢 К сожалению, ничего не выпало!";
        }

        localStorage.setItem(WHEEL_LAST_SPIN_KEY, String(Date.now()));
        checkWheelCooldown();
    }, 4600);
}

// ─── Апгрейдер (Стильный круговой интерфейс) ──────────────
const UPGRADER_BALANCE_KEY = "upgraderBalance";
const UPGRADER_BEST_KEY = "upgraderBest";
const UPGRADER_OPTIONS = [
    { mult: 1.5, chance: 60 },
    { mult: 2, chance: 47 },
    { mult: 5, chance: 18 },
    { mult: 10, chance: 9 }
];
let upgraderBalance = 100;
let upgraderSelectedIndex = 1;
let upgraderBusy = false;

function loadUpgraderBalance() {
    const raw = localStorage.getItem(UPGRADER_BALANCE_KEY);
    const parsed = raw !== null ? parseInt(raw, 10) : NaN;
    upgraderBalance = isNaN(parsed) ? 100 : parsed;
}

function saveUpgraderBalance() {
    localStorage.setItem(UPGRADER_BALANCE_KEY, String(upgraderBalance));
}

function renderUpgraderBalance() {
    const el = document.getElementById("upgraderBalance");
    if (el) el.textContent = upgraderBalance;
}

function renderUpgraderMultButtons() {
    const row = document.getElementById("upgraderMultRow");
    if (!row) return;
    row.innerHTML = "";
    UPGRADER_OPTIONS.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "upgrader-mult-btn" + (i === upgraderSelectedIndex ? " selected" : "");
        btn.innerHTML = `x${opt.mult}`;
        btn.onclick = () => selectUpgraderMultiplier(i);
        row.appendChild(btn);
    });
}

function selectUpgraderMultiplier(index) {
    if (upgraderBusy) return;
    upgraderSelectedIndex = index;
    renderUpgraderMultButtons();
    updateUpgraderGauge(UPGRADER_OPTIONS[index].chance);
}

function updateUpgraderGauge(chance) {
    const chanceText = document.getElementById("upgraderChanceText");
    const gaugeFill = document.getElementById("upgraderGaugeFill");
    if (chanceText) chanceText.textContent = chance + "%";
    
    if (gaugeFill) {
        // Заполняем дугу на основе шанса (Длина дуги 212)
        const totalLen = 212;
        const offset = totalLen - (totalLen * chance) / 100;
        gaugeFill.style.strokeDasharray = `${totalLen}`;
        gaugeFill.style.strokeDashoffset = `${offset}`;
    }
}

function setUpgraderStake(val) {
    const input = document.getElementById("upgraderStake");
    if (input) input.value = val;
}

function setUpgraderStakeMax() {
    const input = document.getElementById("upgraderStake");
    if (input) input.value = Math.max(1, upgraderBalance);
}

function doUpgrade() {
    if (upgraderBusy) return;
    const input = document.getElementById("upgraderStake");
    const resultEl = document.getElementById("upgraderResult");
    const btn = document.getElementById("upgraderBtn");
    if (!input || !resultEl) return;

    const stake = parseInt(input.value, 10);
    if (isNaN(stake) || stake < 1) {
        resultEl.textContent = "⚠️ Введи корректную ставку";
        return;
    }
    if (stake > upgraderBalance) {
        resultEl.textContent = "⚠️ Недостаточно коинов";
        return;
    }

    const option = UPGRADER_OPTIONS[upgraderSelectedIndex];
    const roll = Math.random() * 100;
    const win = roll < option.chance;

    upgraderBusy = true;
    if (btn) btn.disabled = true;
    resultEl.textContent = "🎰 Апгрейдим...";

    setTimeout(() => {
        if (win) {
            const gain = Math.round(stake * (option.mult - 1));
            upgraderBalance += gain;
            resultEl.textContent = `🎉 Успех! +${gain} 🪙`;
            // Сразу же обновляем лидерборд при выигрыше
            checkUpgraderBest();
        } else {
            upgraderBalance -= stake;
            if (upgraderBalance < 0) upgraderBalance = 0;
            resultEl.textContent = `💥 Неудача. -${stake} 🪙`;
        }
        saveUpgraderBalance();
        renderUpgraderBalance();

        upgraderBusy = false;
        if (btn) btn.disabled = false;

        if (upgraderBalance <= 0) {
            resultEl.textContent += " Коины закончились — сбрось баланс!";
        }
    }, 1000);
}

function checkUpgraderBest() {
    const raw = localStorage.getItem(UPGRADER_BEST_KEY);
    const best = raw !== null ? parseInt(raw, 10) : 0;
    if (upgraderBalance > best) {
        localStorage.setItem(UPGRADER_BEST_KEY, String(upgraderBalance));
        submitScore(upgraderBalance);
    }
}

function resetUpgrader() {
    upgraderBalance = 100;
    saveUpgraderBalance();
    renderUpgraderBalance();
    const resultEl = document.getElementById("upgraderResult");
    if (resultEl) resultEl.textContent = "Баланс сброшен до 100 🪙";
}

function initUpgrader() {
    loadUpgraderBalance();
    renderUpgraderBalance();
    renderUpgraderMultButtons();
    updateUpgraderGauge(UPGRADER_OPTIONS[upgraderSelectedIndex].chance);
}

// ─── Лидерборд ──────────────────────────────────────────────
async function submitScore(score) {
    const profile = getProfile();
    if (!profile) return;
    try {
        await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                action: "submit_score",
                player_name: profile.name,
                player_avatar: profile.avatar,
                score: score
            })
        });
        // Сразу перезагружаем актуальный лидерборд
        loadLeaderboard();
    } catch (e) {
        console.error("Ошибка отправки результата:", e);
    }
}

async function loadLeaderboard() {
    const listEl = document.getElementById("leaderboardList");
    if (!listEl) return;
    try {
        const response = await fetch(WORKER_URL + "leaderboard", {
            method: "GET",
            credentials: "include"
        });
        if (!response.ok) throw new Error("bad response");
        const rows = await response.json();

        if (!rows.length) {
            listEl.innerHTML = `<div class="leaderboard-empty">Пока никто не играл в Апгрейдер</div>`;
            return;
        }

        const profile = getProfile();
        listEl.innerHTML = rows.map((row, i) => `
            <div class="leaderboard-row ${profile && row.author_name === profile.name ? 'is-you' : ''}">
                <span class="leaderboard-rank">#${i + 1}</span>
                <img class="leaderboard-avatar" src="${row.author_avatar || DEFAULT_AVATAR}" alt="" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}'">
                <span class="leaderboard-name">${escapeHtml(row.author_name || "Аноним")}</span>
                <span class="leaderboard-score">${row.score} 🪙</span>
            </div>
        `).join("");
    } catch (e) {
        listEl.innerHTML = `<div class="leaderboard-empty">Не удалось загрузить лидерборд</div>`;
    }
}

// Инициализация при завантажении
document.addEventListener("DOMContentLoaded", () => {
    drawWheel();
    initUpgrader();
});

// Глобальный экспорт
window.login = login;
window.logout = logout;
window.requestLogout = requestLogout;
window.saveNote = saveNote;
window.deleteNote = deleteNote;
window.editNote = editNote;
window.handleSearch = handleSearch;
window.handleSort = handleSort;
window.setSort = setSort;
window.toggleSortMenu = toggleSortMenu;
window.togglePin = togglePin;
window.resetForm = resetForm;
window.handleImageUpload = handleImageUpload;
window.openNoteModal = openNoteModal;
window.closeModal = closeModal;
window.filterCategory = filterCategory;
window.setCategory = setCategory;
window.closeConfirmModal = closeConfirmModal;
window.copyToClipboard = copyToClipboard;
window.copyNoteById = copyNoteById;
window.copyModalContent = copyModalContent;
window.setTheme = setTheme;
window.closeToast = closeToast;
window.showToast = showToast;
window.escapeHtml = escapeHtml;
window.openGamesPanel = openGamesPanel;
window.closeGamesPanel = closeGamesPanel;
window.spinWheel = spinWheel;
window.setUpgraderStake = setUpgraderStake;
window.setUpgraderStakeMax = setUpgraderStakeMax;
window.doUpgrade = doUpgrade;
window.resetUpgrader = resetUpgrader;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.saveProfile = saveProfile;
window.handleAvatarUpload = handleAvatarUpload;
window.resetAvatarToDefault = resetAvatarToDefault;
window.connectNotesSocket = connectNotesSocket;
window.disconnectNotesSocket = disconnectNotesSocket;
