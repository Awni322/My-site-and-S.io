const WORKER_URL = "https://my-password-check.minecraftpesok.workers.dev/";

let currentImageBase64 = null;
let currentNotesList = []; 
let activeCategory = "all";
let activeSort = "newest"; 
let noteIdToDelete = null;

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

// Автоматическая привязка кнопки входа и инициализация тем
document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", login);
    }

    // Поддержка нажатия Enter в поле ввода пароля
    const passwordInput = document.getElementById("password");
    if (passwordInput) {
        passwordInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                login();
            }
        });
    }

    // Восстановление темы
    const savedTheme = localStorage.getItem("site_theme");
    if (savedTheme) {
        if (savedTheme === "default") {
            document.documentElement.removeAttribute("data-theme");
        } else {
            document.documentElement.setAttribute("data-theme", savedTheme);
        }
    }

    // Выпадающее меню настроек
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

    let body = {
        action: action,
        title: title,
        content: content,
        category: category,
        roblox_url: robloxUrl,
        image: imageBase64,
        is_pinned: isPinned
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
            resetForm();
            loadNotes();
        } else {
            alert("Ошибка сохранения на сервере.");
        }
    } catch (err) {
        console.error("Ошибка при сохранении:", err);
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
            currentNotesList = await response.json();
            applyFiltersAndRender();
        }
    } catch (err) {
        console.error("Ошибка загрузки:", err);
    }
}

function getNoteTimestamp(note) {
    if (note.created_at) return Number(note.created_at);
    // Старые записи без даты — fallback по id
    return Number(note.id) || 0;
}

function formatNoteDate(note) {
    const ts = getNoteTimestamp(note);
    // Если это маленький id (старые записи) — не показываем странную дату 1970
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
        // Закреплённые всегда сверху
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

function handleSort() {
    setSort(activeSort);
}

function filterCategory(category, event) {
    activeCategory = category;
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    if (event && event.target) {
        event.target.classList.add("active");
    }
    applyFiltersAndRender();
}

function handleSearch() {
    let query = document.getElementById("search").value.toLowerCase().trim();
    if (!query) {
        applyFiltersAndRender();
        return;
    }
    let filtered = currentNotesList.filter(n =>
        (n.title || "").toLowerCase().includes(query) ||
        (n.content || "").toLowerCase().includes(query)
    );

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

// Быстрое копирование с карточки
function copyToClipboard(text, buttonEl) {
    navigator.clipboard.writeText(text).then(() => {
        let originalText = buttonEl.innerText;
        buttonEl.innerText = "✅ Скопировано!";
        setTimeout(() => {
            buttonEl.innerText = originalText;
        }, 1500);
    }).catch(err => console.error("Ошибка копирования: ", err));
}

// Копирование из модального окна
function copyModalContent() {
    let text = document.getElementById("modalText").innerText;
    let btn = document.getElementById("btnModalCopy");
    
    navigator.clipboard.writeText(text).then(() => {
        let orig = btn.innerHTML;
        btn.innerHTML = "✅ Скопировано!";
        setTimeout(() => { btn.innerHTML = orig; }, 1500);
    });
}

// Экранирование HTML — защита от XSS
function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Рендер карточек
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

    document.getElementById("notes").innerHTML = output;
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
        if (!/^https?:\/\//i.test(url)) {
            robloxContainer.innerHTML = "";
        } else {
            robloxContainer.innerHTML = `
                <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="roblox-link-btn">
                    📎 Открыть ссылку  
                </a>
            `;
        }
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

// Заполнение формы для редактирования
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

// Сброс формы
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

// Закрепление
async function togglePin(id, status) {
    await fetch(WORKER_URL, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "toggle_pin", id: id, is_pinned: status }),
        credentials: "include"
    });
    loadNotes();
}

// Удаление
function deleteNote(id) {
    noteIdToDelete = id;
    const overlay = document.getElementById("confirmOverlay");
    const confirmBtn = document.getElementById("btnConfirmDelete");

    if (confirmBtn && overlay) {
        confirmBtn.onclick = () => confirmDelete();
        overlay.classList.add("active");
    }
}

function closeConfirmModal() {
    const overlay = document.getElementById("confirmOverlay");
    if (overlay) overlay.classList.remove("active");
    noteIdToDelete = null;
}

async function confirmDelete() {
    if (!noteIdToDelete) return;
    try {
        await fetch(WORKER_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ action: "delete", id: noteIdToDelete }),
            credentials: "include"
        });
        closeConfirmModal();
        loadNotes();
    } catch (err) {
        console.error("Ошибка удаления:", err);
    }
}

function closeModal() {
    document.getElementById("modalOverlay").classList.remove("active");
}

// Управление темами через выпадающее меню
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

    if (dropdown) {
        dropdown.classList.remove("active");
    }
}

// Автоматическая проверка сессии (входа без пароля) при загрузке страницы
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
            
            // 👉 ВОТ ЗДЕСЬ ТЕПЕРЬ ВЫЗЫВАЕТСЯ УВЕДОМЛЕНИЕ ПРИ АВТОМАТИЧЕСКОМ ВХОДЕ
            showAutoLoginToast();
        } else {
            if (loginContainer) loginContainer.style.display = "block";
            if (contentContainer) contentContainer.style.display = "none";
        }
    } catch (error) {
        console.error("Ошибка при проверке сессии:", error);
        if (loginContainer) loginContainer.style.display = "block";
        if (contentContainer) contentContainer.style.display = "none";
    }
});

// Функции для всплывающего уведомления
function showAutoLoginToast() {
    let toast = document.getElementById("autoLoginToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "autoLoginToast";
        toast.className = "toast-notification";
        toast.innerHTML = `
            <span>💡 Так как вы уже вводили пароль, ещё раз вводить его не нужно</span>
            <button class="toast-close" onclick="closeToast()">✕</button>
        `;
        document.body.appendChild(toast);
    }

    setTimeout(() => {
        toast.classList.add("show");
    }, 100);

    window.toastTimer = setTimeout(() => {
        closeToast();
    }, 6000);
}

function closeToast() {
    const toast = document.getElementById("autoLoginToast");
    if (toast) {
        toast.classList.remove("show");
        clearTimeout(window.toastTimer);
    }
}

// Выход из аккаунта
async function logout() {
    const dropdown = document.getElementById("settingsDropdown");
    if (dropdown) dropdown.classList.remove("active");

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
}

// Экспорт функций в глобальную область видимости
window.login = login;
window.logout = logout;
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
window.closeConfirmModal = closeConfirmModal;
window.copyToClipboard = copyToClipboard;
window.copyNoteById = copyNoteById;
window.copyModalContent = copyModalContent;
window.setTheme = setTheme;
window.closeToast = closeToast;
window.escapeHtml = escapeHtml;
