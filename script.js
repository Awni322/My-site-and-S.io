const WORKER_URL = "https://my-password-check.minecraftpesok.workers.dev/";

let currentImageBase64 = null;
let currentAvatarBase64 = null;
let currentNotesList = [];
let activeCategory = "all";
let activeSort = "newest";
let noteIdToDelete = null;
let currentUser = null;

// Показать форму входа
function showLoginForm() {
    document.getElementById("loginForm").style.display = "block";
    document.getElementById("registerForm").style.display = "none";
    document.getElementById("loginMessage").innerHTML = "";
}

// Показать форму регистрации
function showRegisterForm() {
    document.getElementById("registerForm").style.display = "block";
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("registerMessage").innerHTML = "";
}

// Обработка загрузки аватарки
function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        currentAvatarBase64 = event.target.result;
        const preview = document.getElementById("avatarPreview");
        const resetBtn = document.getElementById("resetAvatarBtn");

        if (preview) {
            preview.innerHTML = `<img src="${currentAvatarBase64}" alt="Avatar">`;
        }
        if (resetBtn) {
            resetBtn.style.display = "block";
        }
    };
    reader.readAsDataURL(file);
}

// Сброс аватарки
function resetAvatar() {
    currentAvatarBase64 = null;
    const preview = document.getElementById("avatarPreview");
    const resetBtn = document.getElementById("resetAvatarBtn");
    const input = document.getElementById("avatarInput");

    if (preview) {
        preview.innerHTML = `
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="40" fill="#4a5568"/>
                <circle cx="40" cy="30" r="12" fill="#718096"/>
                <path d="M20 65C20 55 28 50 40 50C52 50 60 55 60 65" fill="#718096"/>
            </svg>
        `;
    }
    if (resetBtn) {
        resetBtn.style.display = "none";
    }
    if (input) {
        input.value = "";
    }
}

// Регистрация
async function register() {
    const username = document.getElementById("regUsername").value.trim();
    const password = document.getElementById("regPassword").value;
    const displayName = document.getElementById("regDisplayName").value.trim();
    const message = document.getElementById("registerMessage");

    if (!username || !password || !displayName) {
        message.innerHTML = "⚠️ Заполните все поля";
        message.style.color = "#fbbf24";
        return;
    }

    if (username.length < 3) {
        message.innerHTML = "⚠️ Имя пользователя должно быть не менее 3 символов";
        message.style.color = "#fbbf24";
        return;
    }

    if (password.length < 6) {
        message.innerHTML = "⚠️ Пароль должен быть не менее 6 символов";
        message.style.color = "#fbbf24";
        return;
    }

    message.innerHTML = "Создание аккаунта...";
    message.style.color = "#ffffff";

    try {
        const response = await fetch(WORKER_URL + "register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username,
                password,
                displayName,
                avatar: currentAvatarBase64
            }),
            credentials: "include"
        });

        const data = await response.json();

        if (response.ok) {
            message.innerHTML = "✅ Аккаунт создан!";
            message.style.color = "#4ade80";
            currentUser = data.user;

            setTimeout(() => {
                document.getElementById("authScreen").style.display = "none";
                document.getElementById("content").style.display = "flex";
                updateUserProfile();
                loadNotes();
                connectNotesSocket();
            }, 800);
        } else {
            message.innerHTML = `❌ ${data.error === "Username already exists" ? "Это имя уже занято" : "Ошибка регистрации"}`;
            message.style.color = "#f87171";
        }
    } catch (e) {
        message.innerHTML = "❌ Ошибка соединения";
        message.style.color = "#f87171";
    }
}

// Авторизация
async function login() {
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;
    const message = document.getElementById("loginMessage");

    if (!username || !password) {
        message.innerHTML = "⚠️ Заполните все поля";
        message.style.color = "#fbbf24";
        return;
    }

    message.innerHTML = "Проверка...";
    message.style.color = "#ffffff";

    try {
        const response = await fetch(WORKER_URL + "login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
            credentials: "include"
        });

        if (response.ok) {
            const data = await response.json();
            message.innerHTML = "✅ Вход выполнен";
            message.style.color = "#4ade80";
            currentUser = data.user;

            setTimeout(() => {
                document.getElementById("authScreen").style.display = "none";
                document.getElementById("content").style.display = "flex";
                updateUserProfile();
                loadNotes();
                connectNotesSocket();
            }, 500);
        } else if (response.status === 429) {
            const data = await response.json();
            const mins = data.retry_after ? Math.ceil(data.retry_after / 60) : 15;
            message.innerHTML = `⏳ Слишком много попыток. Подождите ~${mins} мин.`;
            message.style.color = "#fbbf24";
        } else {
            message.innerHTML = "❌ Неверные данные";
            message.style.color = "#f87171";
        }
    } catch (e) {
        message.innerHTML = "❌ Ошибка соединения";
        message.style.color = "#f87171";
    }
}

// Обновление информации о пользователе в интерфейсе
function updateUserProfile() {
    if (!currentUser) return;

    const avatarEl = document.getElementById("userAvatar");
    const displayNameEl = document.getElementById("userDisplayName");

    if (avatarEl) {
        if (currentUser.avatar) {
            avatarEl.src = currentUser.avatar;
        } else {
            avatarEl.src = "data:image/svg+xml," + encodeURIComponent(`
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="18" cy="18" r="18" fill="#4a5568"/>
                    <circle cx="18" cy="13" r="5" fill="#718096"/>
                    <path d="M9 29C9 24.5 12 22 18 22C24 22 27 24.5 27 29" fill="#718096"/>
                </svg>
            `);
        }
    }

    if (displayNameEl) {
        displayNameEl.textContent = currentUser.displayName;
    }
}

// Автоматическая привязка событий и инициализация тем
document.addEventListener("DOMContentLoaded", () => {
    // Поддержка нажатия Enter в формах
    const loginPassword = document.getElementById("loginPassword");
    if (loginPassword) {
        loginPassword.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                login();
            }
        });
    }

    const regPassword = document.getElementById("regPassword");
    if (regPassword) {
        regPassword.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                register();
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
            const catMenu = document.getElementById("categoryMenu");
            const catTrigger = document.getElementById("categoryTrigger");
            if (catMenu) catMenu.classList.remove("active");
            if (catTrigger) catTrigger.classList.remove("open");
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
            // Перерисовываем карточки только если данные реально изменились —
            // иначе при каждом опросе (раз в 5с) список будет "прыгать" без причины
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
    // закрыть меню категорий
    const catMenu = document.getElementById("categoryMenu");
    const catTrigger = document.getElementById("categoryTrigger");
    if (catMenu) catMenu.classList.remove("active");
    if (catTrigger) catTrigger.classList.remove("open");

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

function setCategory(category, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    activeCategory = category || "all";

    // Подсветка кнопок категорий
    document.querySelectorAll(".category-filters .filter-btn").forEach(btn => {
        const isActive = btn.getAttribute("data-category") === activeCategory;
        btn.classList.toggle("active", isActive);
    });

    // Если вдруг остался dropdown-вариант — тоже обновим
    document.querySelectorAll("#categoryMenu .sort-option").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.category === activeCategory);
    });
    const labels = { all: "📁 Все", "Заметки": "📝 Заметки", "Скрипты": "📜 Скрипты" };
    const label = document.getElementById("categoryLabel");
    if (label) label.textContent = labels[activeCategory] || "📁 Все";

    const search = document.getElementById("search");
    if (search && search.value.trim()) {
        handleSearch();
    } else {
        applyFiltersAndRender();
    }
}

function filterCategory(category, event) {
    setCategory(category, event);
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

    const notesEl = document.getElementById("notes");
    if (!output) {
        const hasAny = currentNotesList.length > 0;
        const search = document.getElementById("search");
        const q = search ? search.value.trim() : "";
        let title, text;
        if (!hasAny) {
            title = "Пока пусто";
            text = "Добавь первую запись — заметку или скрипт";
        } else if (q) {
            title = "Ничего не найдено";
            text = "Попробуй изменить запрос или сбросить поиск";
        } else {
            title = "В этой категории пусто";
            text = "Выбери другую категорию или создай новую запись";
        }
        notesEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <div class="empty-title">${title}</div>
                <div class="empty-text">${text}</div>
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
    try {
        await fetch(WORKER_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ action: "toggle_pin", id: id, is_pinned: status }),
            credentials: "include"
        });
        loadNotes();
        showToast(status ? "📌 Закреплено" : "📍 Откреплено");
    } catch (err) {
        showToast("❌ Не удалось изменить", "error");
    }
}

// Универсальное окно подтверждения
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

// Удаление
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
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ action: "delete", id: noteIdToDelete }),
            credentials: "include"
        });
        closeConfirmModal();
        loadNotes();
        showToast("🗑 Запись удалена");
    } catch (err) {
        console.error("Ошибка удаления:", err);
        showToast("❌ Ошибка удаления", "error");
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

// Автоматическая проверка сессии при загрузке страницы
document.addEventListener("DOMContentLoaded", async () => {
    const authScreen = document.getElementById("authScreen");
    const contentContainer = document.getElementById("content");

    try {
        // Проверяем текущего пользователя
        let response = await fetch(WORKER_URL + "me", {
            method: "GET",
            credentials: "include"
        });

        if (response.ok) {
            currentUser = await response.json();

            // Загружаем заметки
            let notesResponse = await fetch(WORKER_URL, {
                method: "GET",
                credentials: "include"
            });

            if (notesResponse.ok) {
                currentNotesList = await notesResponse.json();
            }

            if (authScreen) authScreen.style.display = "none";
            if (contentContainer) contentContainer.style.display = "flex";
            updateUserProfile();
            applyFiltersAndRender();
            connectNotesSocket();
            showAutoLoginToast();
        } else {
            if (authScreen) authScreen.style.display = "flex";
            if (contentContainer) contentContainer.style.display = "none";
        }
    } catch (error) {
        console.error("Ошибка при проверке сессии:", error);
        if (authScreen) authScreen.style.display = "flex";
        if (contentContainer) contentContainer.style.display = "none";
    }
});

// Универсальные всплывающие уведомления
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

    // перезапуск анимации
    void toast.offsetWidth;
    setTimeout(() => toast.classList.add("show"), 10);

    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => closeToast(), 3200);
}

function showAutoLoginToast() {
    showToast("💡 Пароль уже вводили — повторный вход не нужен");
}

function closeToast() {
    const toast = document.getElementById("appToast") || document.getElementById("autoLoginToast");
    if (toast) {
        toast.classList.remove("show");
        clearTimeout(window.toastTimer);
    }
}

// Запрос выхода — с подтверждением
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

// Выход из аккаунта
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
    document.getElementById("authScreen").style.display = "flex";

    // Очищаем формы
    const loginUsername = document.getElementById("loginUsername");
    const loginPassword = document.getElementById("loginPassword");
    const loginMessage = document.getElementById("loginMessage");
    if (loginUsername) loginUsername.value = "";
    if (loginPassword) loginPassword.value = "";
    if (loginMessage) loginMessage.innerHTML = "";

    currentNotesList = [];
    currentUser = null;
    showLoginForm();
    showToast("🚪 Вы вышли");
}

// ==========================================
// РЕАЛЬНОЕ ВРЕМЯ — периодический опрос (polling)
// ==========================================
const NOTES_POLL_INTERVAL_MS = 5000;
let notesPollTimer = null;

function connectNotesSocket() {
    // Название сохранено для совместимости с остальным кодом (login/logout),
    // но по сути это запуск обычного опроса сервера через равные интервалы.
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

// Сразу опрашиваем сервер, когда пользователь возвращается на вкладку —
// чтобы не ждать до конца текущего интервала
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
    if (panel) panel.classList.add("active");
}

function closeGamesPanel() {
    const panel = document.getElementById("gamesPanel");
    if (panel) panel.classList.remove("active");
}

// ─── Колесо фортуны ─────────────────────────────────────────
const wheelSegments = ["🎉 Приз!", "😢 Мимо", "🔥 Ещё раз", "⭐ Бонус", "💤 Пусто", "🎁 Сюрприз", "🍀 Удача", "💥 Взрыв"];
const wheelColors = ["#34d399", "#38bdf8", "#f472b6", "#fbbf24", "#a78bfa", "#fb7185", "#4ade80", "#f97316"];
let currentWheelRotation = 0;
let wheelSpinning = false;

function drawWheel() {
    const canvas = document.getElementById("wheelCanvas");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = canvas.width / 2 - 4;
    const segAngle = (2 * Math.PI) / wheelSegments.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    wheelSegments.forEach((label, i) => {
        const start = i * segAngle;
        const end = start + segAngle;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, end);
        ctx.closePath();
        ctx.fillStyle = wheelColors[i % wheelColors.length];
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(start + segAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#10151f";
        ctx.font = "600 13px Inter, sans-serif";
        ctx.fillText(label, radius - 14, 5);
        ctx.restore();
    });
}

function spinWheel() {
    if (wheelSpinning) return;
    const canvas = document.getElementById("wheelCanvas");
    const resultEl = document.getElementById("wheelResult");
    if (!canvas) return;

    wheelSpinning = true;
    if (resultEl) resultEl.textContent = "";

    const segAngle = 360 / wheelSegments.length;
    const winIndex = Math.floor(Math.random() * wheelSegments.length);
    const targetCenter = winIndex * segAngle + segAngle / 2;

    // Указатель находится сверху (270° в системе координат canvas)
    let needed = (270 - targetCenter) % 360;
    if (needed < 0) needed += 360;

    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const currentMod = ((currentWheelRotation % 360) + 360) % 360;
    currentWheelRotation += extraSpins * 360 + ((needed - currentMod) + 360) % 360;

    canvas.style.transform = `rotate(${currentWheelRotation}deg)`;

    setTimeout(() => {
        wheelSpinning = false;
        if (resultEl) resultEl.textContent = "Выпало: " + wheelSegments[winIndex];
    }, 4600);
}

// ─── Крестики-нолики ────────────────────────────────────────
let tttBoard = Array(9).fill(null);
let tttGameOver = false;

function renderTicTacToe() {
    const boardEl = document.getElementById("tttBoard");
    if (!boardEl) return;
    boardEl.innerHTML = "";
    tttBoard.forEach((val, i) => {
        const cell = document.createElement("div");
        cell.className = "ttt-cell" + (val ? " taken" : "");
        cell.textContent = val || "";
        cell.onclick = () => tttMove(i);
        boardEl.appendChild(cell);
    });
}

function checkTttWinner(board) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    if (board.every(v => v)) return "draw";
    return null;
}

function getComputerMove(board) {
    const empty = board.map((v, i) => (v ? null : i)).filter(v => v !== null);
    if (empty.length === 0) return -1;

    for (const i of empty) {
        const copy = board.slice();
        copy[i] = "⭕";
        if (checkTttWinner(copy) === "⭕") return i;
    }
    for (const i of empty) {
        const copy = board.slice();
        copy[i] = "❌";
        if (checkTttWinner(copy) === "❌") return i;
    }
    if (board[4] === null) return 4;
    return empty[Math.floor(Math.random() * empty.length)];
}

function tttMove(i) {
    if (tttGameOver || tttBoard[i]) return;
    tttBoard[i] = "❌";
    let winner = checkTttWinner(tttBoard);

    if (!winner) {
        const compMove = getComputerMove(tttBoard);
        if (compMove !== -1) tttBoard[compMove] = "⭕";
        winner = checkTttWinner(tttBoard);
    }

    renderTicTacToe();
    const resultEl = document.getElementById("tttResult");
    if (!resultEl) return;

    if (winner === "draw") {
        tttGameOver = true;
        resultEl.textContent = "🤝 Ничья!";
    } else if (winner === "❌") {
        tttGameOver = true;
        resultEl.textContent = "🎉 Ты выиграл!";
    } else if (winner === "⭕") {
        tttGameOver = true;
        resultEl.textContent = "😅 Компьютер выиграл!";
    } else {
        resultEl.textContent = "Твой ход!";
    }
}

function resetTicTacToe() {
    tttBoard = Array(9).fill(null);
    tttGameOver = false;
    renderTicTacToe();
    const resultEl = document.getElementById("tttResult");
    if (resultEl) resultEl.textContent = "Ты играешь за ❌. Ходи первым!";
}

// ─── Угадай число ───────────────────────────────────────────
let secretNumber = Math.floor(Math.random() * 100) + 1;
let guessAttempts = 0;

function makeGuess() {
    const input = document.getElementById("guessInput");
    const resultEl = document.getElementById("guessResult");
    if (!input || !resultEl) return;

    const val = parseInt(input.value, 10);
    if (isNaN(val) || val < 1 || val > 100) {
        resultEl.textContent = "⚠️ Введи число от 1 до 100";
        return;
    }

    guessAttempts++;
    if (val === secretNumber) {
        resultEl.textContent = `🎉 Угадал! Число было ${secretNumber}. Попыток: ${guessAttempts}`;
    } else if (val < secretNumber) {
        resultEl.textContent = "📈 Больше!";
    } else {
        resultEl.textContent = "📉 Меньше!";
    }

    input.value = "";
    input.focus();
}

function resetGuessGame() {
    secretNumber = Math.floor(Math.random() * 100) + 1;
    guessAttempts = 0;
    const resultEl = document.getElementById("guessResult");
    if (resultEl) resultEl.textContent = "Загадано новое число!";
    const input = document.getElementById("guessInput");
    if (input) input.value = "";
}

// Инициализация игр при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
    drawWheel();
    renderTicTacToe();

    const guessInput = document.getElementById("guessInput");
    if (guessInput) {
        guessInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") makeGuess();
        });
    }
});

// Экспорт функций в глобальную область видимости
window.login = login;
window.register = register;
window.logout = logout;
window.requestLogout = requestLogout;
window.showLoginForm = showLoginForm;
window.showRegisterForm = showRegisterForm;
window.handleAvatarUpload = handleAvatarUpload;
window.resetAvatar = resetAvatar;
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
window.resetTicTacToe = resetTicTacToe;
window.makeGuess = makeGuess;
window.resetGuessGame = resetGuessGame;
window.connectNotesSocket = connectNotesSocket;
window.disconnectNotesSocket = disconnectNotesSocket;
