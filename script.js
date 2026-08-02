const WORKER_URL = "https://my-password-check.minecraftpesok.workers.dev/";

let currentImageBase64 = null;
let currentNotesList = []; 
let activeCategory = "all"; 
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
        } else {
            message.innerHTML = "❌ Неверный пароль напиши в тг: love40404";
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

    // Восстановление темы
    const savedTheme = localStorage.getItem("site_theme");
    if (savedTheme) {
        if (savedTheme === "default") {
            document.documentElement.removeAttribute("data-theme");
        } else {
            document.documentElement.setAttribute("data-theme", savedTheme);
        }
    }

    // Выпадающее меню тем
    const menuBtn = document.getElementById("themeMenuBtn");
    const dropdown = document.getElementById("themeDropdown");

    if (menuBtn && dropdown) {
        menuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdown.classList.toggle("active");
        });

        document.addEventListener("click", () => {
            dropdown.classList.remove("active");
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
        currentNotesList = await response.json();
        applyFiltersAndRender();
    } catch (err) {
        console.error("Ошибка загрузки:", err);
    }
}

function applyFiltersAndRender() {
    let filtered = currentNotesList;
    if (activeCategory !== "all") {
        filtered = currentNotesList.filter(n => (n.category || "Заметки") === activeCategory);
    }
    renderNotes(filtered);
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
    let query = document.getElementById("search").value.toLowerCase();
    let filtered = currentNotesList.filter(n => 
        n.title.toLowerCase().includes(query) || 
        n.content.toLowerCase().includes(query)
    );
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

// Рендер карточек
function renderNotes(notes) {
    let output = "";

    notes.forEach(note => {
        const isPinned = note.is_pinned === 1 || note.is_pinned === true;
        const categoryName = note.category || "Заметки";

        // Безопасно экранируем содержимое для HTML и JS-атрибутов
        const safeContentForClick = JSON.stringify(note.content);

        output += `
        <div class="note-card ${isPinned ? 'pinned' : ''}" onclick="openNoteModal(${note.id})">
            ${isPinned ? '<div class="pin-badge">📌 Закреплено</div>' : ''}
            
            <span class="category-badge">${categoryName === 'Скрипты' ? '📜 Скрипты' : '📝 Заметки'}</span>

            <h3 class="note-title">${note.title}</h3>
            <div class="note-content">${note.content}</div>

            ${note.image ? `
                <div class="note-image-container">
                    <img src="${note.image}" class="note-image" alt="Фото">
                </div>
            ` : ""}

            <div class="note-actions">
                <button class="btn-action btn-copy" onclick="event.stopPropagation(); copyToClipboard(${safeContentForClick.replace(/"/g, '&quot;')}, this)">
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
        `;
    });

    document.getElementById("notes").innerHTML = output;
}

function openNoteModal(id) {
    let note = currentNotesList.find(n => n.id == id);
    if (!note) return;

    document.getElementById("modalTitle").innerText = note.title;
    document.getElementById("modalText").innerText = note.content;

    let robloxContainer = document.getElementById("modalRobloxContainer");
    if (!robloxContainer) {
        robloxContainer = document.createElement("div");
        robloxContainer.id = "modalRobloxContainer";
        let modalTextEl = document.getElementById("modalText");
        modalTextEl.parentNode.insertBefore(robloxContainer, modalTextEl);
    }

    if (note.roblox_url && note.roblox_url.trim() !== "") {
        let url = note.roblox_url.startsWith("http") ? note.roblox_url : "https://" + note.roblox_url;
        robloxContainer.innerHTML = `
            <a href="${url}" target="_blank" class="roblox-link-btn">
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
function setTheme(themeName) {
    const html = document.documentElement;
    const dropdown = document.getElementById("themeDropdown");

    if (themeName === "default") {
        html.removeAttribute("data-theme");
        localStorage.setItem("site_theme", "default");
    } else {
        html.setAttribute("data-theme", themeName);
        localStorage.setItem("site_theme", themeName);
    }

    if (dropdown) {
        dropdown.classList.remove("active");
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login');
    const contentContainer = document.getElementById('content'); // Контейнер с основным сайтом
    const passwordInput = document.getElementById('passwordInput'); // Укажите ваш ID инпута пароля
    const loginBtn = document.getElementById('loginBtn'); // Укажите ваш ID кнопки входа
    const message = document.getElementById('message');

    // Функция проверки авторизации при старте
    function checkAuth() {
        if (localStorage.getItem('isLoggedIn') === 'true') {
            if (loginContainer) loginContainer.style.display = 'none';
            if (contentContainer) contentContainer.style.display = 'flex'; // или 'block' в зависимости от вашего верстки
        } else {
            if (loginContainer) loginContainer.style.display = 'block';
            if (contentContainer) contentContainer.style.display = 'none';
        }
    }

    // Запускаем проверку сразу при загрузке
    checkAuth();

    // Обработка клика по кнопке входа (или отправки формы)
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const enteredPassword = passwordInput.value;

            // Здесь ваш правильный пароль (или сверка, которая у вас уже используется)
            const correctPassword = 'ваш_пароль'; 

            if (enteredPassword === correctPassword) {
                // Сохраняем флаг, что пользователь залогинен
                localStorage.setItem('isLoggedIn', 'true');
                checkAuth();
            } else {
                if (message) message.textContent = 'Неверный пароль!';
            }
        });
    }
});
// Экспорт функций в глобальную область видимости
window.login = login;
window.saveNote = saveNote;
window.deleteNote = deleteNote;
window.editNote = editNote;
window.handleSearch = handleSearch;
window.togglePin = togglePin;
window.resetForm = resetForm;
window.handleImageUpload = handleImageUpload;
window.openNoteModal = openNoteModal;
window.closeModal = closeModal;
window.filterCategory = filterCategory;
window.closeConfirmModal = closeConfirmModal;
window.copyToClipboard = copyToClipboard;
window.copyModalContent = copyModalContent;
window.setTheme = setTheme;
