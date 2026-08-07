const WORKER_URL = "https://my-password-check.minecraftpesok.workers.dev/";

let currentImageBase64 = null;
let currentNotesList = []; 
let activeCategory = "all";
let activeSort = "newest"; 
let noteIdToDelete = null;

// Хранилище сохраненных паролей
const SAVED_PASSWORDS_KEY = "archiveSavedPasswords";

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
    
    // Обновляем карточки на лету без бага при наведении
    if (oldProfile) {
        currentNotesList.forEach(note => {
            if (note.author_name === oldProfile.name || !note.author_name) {
                note.author_name = name;
                note.author_avatar = selectedAvatar;
            }
        });
        applyFiltersAndRender();
    }

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
    loadLeaderboard();
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

// ==========================================
// ЛОГИКА ПАРОЛЕЙ И ВХОДА ("Уже есть аккаунт?")
// ==========================================
function getSavedPasswords() {
    try {
        return JSON.parse(localStorage.getItem(SAVED_PASSWORDS_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function savePasswordToLocal(pass) {
    if (!pass) return;
    let list = getSavedPasswords();
    if (!list.includes(pass)) {
        list.push(pass);
        localStorage.setItem(SAVED_PASSWORDS_KEY, JSON.stringify(list));
    }
}

function renderSavedPasswords() {
    const container = document.getElementById("savedPasswordsList");
    if (!container) return;
    const list = getSavedPasswords();

    if (list.length === 0) {
        container.innerHTML = `<div class="saved-pass-empty">Нет сохранённых паролей</div>`;
        return;
    }

    container.innerHTML = list.map(pass => `
        <div class="saved-pass-item" onclick="selectSavedPassword('${escapeHtml(pass)}')">
            🔑 <span>${escapeHtml(pass)}</span>
        </div>
    `).join("");
}

function toggleSavedPasswordsMenu() {
    const dropdown = document.getElementById("savedPasswordsDropdown");
    if (!dropdown) return;
    renderSavedPasswords();
    dropdown.classList.toggle("active");
}

function selectSavedPassword(pass) {
    const input = document.getElementById("password");
    if (input) input.value = pass;
    const dropdown = document.getElementById("savedPasswordsDropdown");
    if (dropdown) dropdown.classList.remove("active");
}

function fillSavedAccount() {
    const list = getSavedPasswords();
    if (list.length > 0) {
        selectSavedPassword(list[0]);
        showToast("🔑 Пароль подставлен");
    } else {
        showToast("⚠️ Нет сохраненных паролей", "error");
    }
}

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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: password }),
            credentials: "include"
        });

        if (response.ok) {
            savePasswordToLocal(password);
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

// Инициализация компонентов
document.addEventListener("DOMContentLoaded", () => {
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
            dropdown.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (!e.target.closest(".settings-menu-container")) dropdown.classList.remove("active");
            if (!e.target.closest(".password-input-group")) {
                const passDropdown = document.getElementById("savedPasswordsDropdown");
                if (passDropdown) passDropdown.classList.remove("active");
            }
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
            headers: { "Content-Type": "application/json" },
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
        showToast("❌ Ошибка соединения", "error");
    }
}

async function loadNotes() {
    try {
        let response = await fetch(WORKER_URL, {
            method: "GET",
            credentials: "include"
        });
        if (response.ok) {
            const freshNotes = await response.json();
            currentNotesList = freshNotes;
            applyFiltersAndRender();
        }
    } catch (err) {}
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
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
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
    if (label) label.textContent = activeSort === "oldest" ? "Сначала старые" : "Сначала новые";

    const menu = document.getElementById("sortMenu");
    if (menu) menu.classList.remove("active");

    applyFiltersAndRender();
}

function setCategory(category, event) {
    if (event) event.stopPropagation();
    activeCategory = category || "all";

    document.querySelectorAll(".category-filters .filter-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-category") === activeCategory);
    });

    applyFiltersAndRender();
}

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

    renderNotes(filtered);
}

function copyToClipboard(text, buttonEl) {
    navigator.clipboard.writeText(text).then(() => {
        let originalText = buttonEl.innerText;
        buttonEl.innerText = "✅ Скопировано!";
        setTimeout(() => { buttonEl.innerText = originalText; }, 1500);
    });
}

function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderNotes(notes) {
    let output = "";

    notes.forEach(note => {
        const isPinned = note.is_pinned === 1 || note.is_pinned === true;
        const categoryName = note.category || "Заметки";
        const safeTitle = escapeHtml(note.title);
        const safeContent = escapeHtml(note.content);
        const safeImage = (note.image && note.image.startsWith("data:image/")) ? note.image : null;

        output += `
        <div class="note-card ${isPinned ? 'pinned' : ''}" onclick="openNoteModal(${note.id})">
            ${isPinned ? '<div class="pin-badge">📌 Закреплено</div>' : ''}
            <span class="category-badge">${categoryName === 'Скрипты' ? '📜 Скрипты' : '📝 Заметки'}</span>

            <h3 class="note-title">${safeTitle}</h3>
            <div class="note-content">${safeContent}</div>

            ${safeImage ? `<div class="note-image-container"><img src="${safeImage}" class="note-image" alt="Фото"></div>` : ""}

            <div class="note-date">🕒 ${formatNoteDate(note)}</div>
            <div class="note-footer">
                <div class="note-author">
                    <img class="note-author-avatar" src="${note.author_avatar || DEFAULT_AVATAR}" alt="">
                    <span class="note-author-name">${escapeHtml(note.author_name || "Аноним")}</span>
                </div>
                <div class="note-actions">
                    <button class="btn-action btn-copy" onclick="event.stopPropagation(); copyNoteById(${note.id}, this)">📋</button>
                    <button class="btn-action btn-pin ${isPinned ? 'active' : ''}" onclick="event.stopPropagation(); togglePin(${note.id}, ${!isPinned})">${isPinned ? '📌' : '📍'}</button>
                    <button class="btn-action btn-edit" onclick="event.stopPropagation(); editNote(${note.id})">✏️</button>
                    <button class="btn-action btn-delete" onclick="event.stopPropagation(); deleteNote(${note.id})">🗑</button>
                </div>
            </div>
        </div>
        `;
    });

    const notesEl = document.getElementById("notes");
    notesEl.innerHTML = output || `
        <div class="empty-state">
            <div class="empty-icon">📭</div>
            <div class="empty-title">Пока пусто</div>
        </div>
    `;
}

function copyNoteById(id, buttonEl) {
    const note = currentNotesList.find(n => n.id == id);
    if (note) copyToClipboard(note.content, buttonEl);
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

    document.getElementById("title").dataset.id = note.id;
    document.getElementById("formTitle").innerText = "Редактировать запись";
    document.getElementById("btnCancel").style.display = "block";
    currentImageBase64 = note.image;
}

function resetForm() {
    document.getElementById("title").value = "";
    document.getElementById("contentInput").value = "";
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
    } catch (err) {}
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
    } catch (err) {}
}

function openConfirmModal({ title, text, confirmLabel, onConfirm }) {
    const overlay = document.getElementById("confirmOverlay");
    const confirmBtn = document.getElementById("btnConfirmAction");
    if (!overlay || !confirmBtn) return;
    document.getElementById("confirmTitle").textContent = title || "Подтверждение";
    document.getElementById("confirmText").textContent = text || "Вы уверены?";
    confirmBtn.textContent = confirmLabel || "Подтвердить";
    confirmBtn.onclick = () => { if (typeof onConfirm === "function") onConfirm(); };
    overlay.classList.add("active");
}

function closeConfirmModal() {
    const overlay = document.getElementById("confirmOverlay");
    if (overlay) overlay.classList.remove("active");
    noteIdToDelete = null;
}

function openNoteModal(id) {
    let note = currentNotesList.find(n => n.id == id);
    if (!note) return;
    document.getElementById("modalTitle").innerText = note.title;
    document.getElementById("modalText").innerText = note.content;
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

function closeModal() {
    document.getElementById("modalOverlay").classList.remove("active");
}

function setTheme(themeName) {
    const html = document.documentElement;
    if (themeName === "default") {
        html.removeAttribute("data-theme");
        localStorage.setItem("site_theme", "default");
    } else {
        html.setAttribute("data-theme", themeName);
        localStorage.setItem("site_theme", themeName);
    }
}

function showToast(message, type = "ok") {
    let toast = document.getElementById("appToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "appToast";
        toast.className = "toast-notification";
        toast.innerHTML = `<span class="toast-message"></span>`;
        document.body.appendChild(toast);
    }
    toast.querySelector(".toast-message").textContent = message;
    toast.className = `toast-notification show ${type === "error" ? "toast-error" : "toast-ok"}`;
    setTimeout(() => toast.classList.remove("show"), 3000);
}

function requestLogout() {
    openConfirmModal({
        title: "Выйти из архива?",
        text: "Потребуется снова ввести пароль.",
        confirmLabel: "Выйти",
        onConfirm: logout
    });
}

async function logout() {
    closeConfirmModal();
    try {
        await fetch(WORKER_URL + "logout", { method: "POST", credentials: "include" });
    } catch (_) {}

    document.getElementById("content").style.display = "none";
    document.getElementById("login").style.display = "block";
    showToast("🚪 Вы вышли");
}

// ==========================================
// МИНИ-ИГРЫ
// ==========================================
function openGamesPanel() {
    const panel = document.getElementById("gamesPanel");
    if (panel) panel.classList.add("active");
    updateGamesTopUserInfo();
    loadLeaderboard();
    checkWheelCooldown();
}

function closeGamesPanel() {
    const panel = document.getElementById("gamesPanel");
    if (panel) panel.classList.remove("active");
}

// ─── Колесо фортуны ───────────────────────
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
        if (timerNote) timerNote.textContent = `⏳ До вращения: ${hours}ч ${mins}м ${secs}с`;
        remainingMs -= 1000;
    }
    update();
    wheelTimerInterval = setInterval(update, 1000);
}

function spinWheel() {
    if (wheelSpinning) return;
    if (!checkWheelCooldown()) return;

    const canvas = document.getElementById("wheelCanvas");
    const btn = document.getElementById("wheelSpinBtn");
    if (!canvas) return;

    wheelSpinning = true;
    if (btn) btn.disabled = true;

    const segAngle = 360 / wheelSegments.length;
    const winIndex = Math.floor(Math.random() * wheelSegments.length);
    const targetCenter = winIndex * segAngle + segAngle / 2;

    let needed = (270 - targetCenter) % 360;
    if (needed < 0) needed += 360;

    currentWheelRotation += 5 * 360 + needed;
    canvas.style.transform = `rotate(${currentWheelRotation}deg)`;

    setTimeout(() => {
        wheelSpinning = false;
        const prize = wheelSegments[winIndex];
        
        if (prize.type === "coin") {
            upgraderBalance += prize.value;
            saveUpgraderBalance();
            renderUpgraderBalance();
        }

        localStorage.setItem(WHEEL_LAST_SPIN_KEY, String(Date.now()));
        checkWheelCooldown();
    }, 4600);
}

// ─── Апгрейдер ────────────────────────────
const UPGRADER_BALANCE_KEY = "upgraderBalance";
const UPGRADER_OPTIONS = [
    { mult: 1.5, chance: 60 },
    { mult: 2, chance: 47 },
    { mult: 5, chance: 18 },
    { mult: 10, chance: 9 }
];
let upgraderBalance = 100;
let upgraderSelectedIndex = 1;

function loadUpgraderBalance() {
    const raw = localStorage.getItem(UPGRADER_BALANCE_KEY);
    upgraderBalance = raw !== null ? parseInt(raw, 10) : 100;
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
    row.innerHTML = UPGRADER_OPTIONS.map((opt, i) => `
        <button type="button" class="upgrader-mult-btn ${i === upgraderSelectedIndex ? 'selected' : ''}" onclick="selectUpgraderMultiplier(${i})">x${opt.mult}</button>
    `).join("");
}

function selectUpgraderMultiplier(index) {
    upgraderSelectedIndex = index;
    renderUpgraderMultButtons();
    updateUpgraderGauge(UPGRADER_OPTIONS[index].chance);
}

function updateUpgraderGauge(chance) {
    const chanceText = document.getElementById("upgraderChanceText");
    const gaugeFill = document.getElementById("upgraderGaugeFill");
    if (chanceText) chanceText.textContent = chance + "%";
    if (gaugeFill) {
        const totalLen = 212;
        gaugeFill.style.strokeDasharray = `${totalLen}`;
        gaugeFill.style.strokeDashoffset = `${totalLen - (totalLen * chance) / 100}`;
    }
}

function setUpgraderStake(val) {
    document.getElementById("upgraderStake").value = val;
}

function setUpgraderStakeMax() {
    document.getElementById("upgraderStake").value = Math.max(1, upgraderBalance);
}

function doUpgrade() {
    const input = document.getElementById("upgraderStake");
    const stake = parseInt(input.value, 10);
    if (isNaN(stake) || stake < 1 || stake > upgraderBalance) return;

    const option = UPGRADER_OPTIONS[upgraderSelectedIndex];
    const win = Math.random() * 100 < option.chance;

    if (win) {
        upgraderBalance += Math.round(stake * (option.mult - 1));
        submitScore(upgraderBalance);
    } else {
        upgraderBalance -= stake;
    }
    saveUpgraderBalance();
    renderUpgraderBalance();
}

function resetUpgrader() {
    upgraderBalance = 100;
    saveUpgraderBalance();
    renderUpgraderBalance();
}

// ─── Лидерборд ────────────────────────────
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
        loadLeaderboard();
    } catch (e) {}
}

async function loadLeaderboard() {
    const listEl = document.getElementById("leaderboardList");
    if (!listEl) return;
    try {
        const response = await fetch(WORKER_URL + "leaderboard", { method: "GET", credentials: "include" });
        if (!response.ok) throw new Error();
        const rows = await response.json();

        const profile = getProfile();
        listEl.innerHTML = rows.map((row, i) => {
            const isMe = profile && row.author_name === profile.name;
            const currentAvatar = isMe ? profile.avatar : (row.author_avatar || DEFAULT_AVATAR);
            return `
                <div class="leaderboard-row ${isMe ? 'is-you' : ''}">
                    <span class="leaderboard-rank">#${i + 1}</span>
                    <img class="leaderboard-avatar" src="${currentAvatar}" alt="">
                    <span class="leaderboard-name">${escapeHtml(row.author_name || "Аноним")}</span>
                    <span class="leaderboard-score">${row.score} 🪙</span>
                </div>
            `;
        }).join("");
    } catch (e) {
        listEl.innerHTML = `<div class="leaderboard-empty">Ошибка загрузки</div>`;
    }
}

function connectNotesSocket() {}

document.addEventListener("DOMContentLoaded", () => {
    drawWheel();
    loadUpgraderBalance();
    renderUpgraderBalance();
    renderUpgraderMultButtons();
    updateUpgraderGauge(UPGRADER_OPTIONS[upgraderSelectedIndex].chance);
});
