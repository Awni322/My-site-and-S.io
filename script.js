const WORKER_URL = "https://my-password-check.minecraftpesok.workers.dev/";
let currentImageBase64 = null;
let currentNotesList = []; // Хранилище всех загруженных заметок
let activeCategory = "all"; // Теккущий фильтр категории

// =========================
// Вход
// =========================
async function login() {
    let password = document.getElementById("password").value;
    let message = document.getElementById("message");
    message.innerHTML = "Проверка...";

    try {
        let response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: password })
        });

        if (response.ok) {
            message.innerHTML = "✅ Пароль верный";
            message.style.color = "#4ade80";
            document.getElementById("login").style.display = "none";
            document.getElementById("content").style.display = "flex";
            loadNotes();
        } else {
            message.innerHTML = "❌ Неверный пароль";
            message.style.color = "#f87171";
        }
    } catch (e) {
        message.innerHTML = "❌ Ошибка соединения";
        message.style.color = "#f87171";
    }
}

// Конвертация файла в Base64
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function updateFileName(input) {
    const fileNameText = document.getElementById("fileNameText");
    if (fileNameText && input.files && input.files[0]) {
        fileNameText.innerText = "Файл: " + input.files[0].name;
    } else if (fileNameText) {
        fileNameText.innerText = "Прикрепить фото";
    }
}

// =========================
// Сохранение записи
// =========================
async function saveNote() {
    let title = document.getElementById("title").value;
    let text = document.getElementById("text").value;
    let category = document.getElementById("categorySelect") ? document.getElementById("categorySelect").value : "Заметки";
    let isPinned = document.getElementById("isPinned").checked;
    let imageInput = document.getElementById("imageInput");

    if (!title || !text) {
        alert("Заполни название и текст");
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
        content: text,
        category: category,
        image: imageBase64,
        is_pinned: isPinned
    };

    if (id) {
        body.id = id;
    }

    let response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (response.ok) {
        cancelEdit();
        loadNotes();
    }
}

// =========================
// Загрузка и рендеринг
// =========================
async function loadNotes() {
    let response = await fetch(WORKER_URL);
    currentNotesList = await response.json();
    applyFiltersAndRender();
}

// Фильтрация заметок по категории перед выводом
function applyFiltersAndRender() {
    let filtered = currentNotesList;

    if (activeCategory !== "all") {
        filtered = currentNotesList.filter(n => (n.category || "Заметки") === activeCategory);
    }

    renderNotes(filtered);
}

// Переключение фильтра категории
function filterByCategory(category, btnElement) {
    activeCategory = category;

    // Подсвечиваем активную кнопку
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    if (btnElement) btnElement.classList.add("active");

    applyFiltersAndRender();
}

function renderNotes(notes) {
    let output = "";

    notes.forEach(note => {
        const isPinned = note.is_pinned === 1 || note.is_pinned === true;
        const categoryName = note.category || "Заметки";

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
                <button class="btn-action btn-pin ${isPinned ? 'active' : ''}" onclick="event.stopPropagation(); togglePin(${note.id}, ${!isPinned})">
                    ${isPinned ? '📌 Открепить' : '📌 Закрепить'}
                </button>
                <button class="btn-action btn-edit" onclick="event.stopPropagation(); editNote(${note.id})">
                    ✏️ Изменить
                </button>
                <button class="btn-action btn-delete" onclick="event.stopPropagation(); deleteNote(${note.id})">
                    🗑 Удалить
                </button>
            </div>
        </div>
        `;
    });

    document.getElementById("notes").innerHTML = output;
}

// =========================
// Вспомогательные функции
// =========================
async function togglePin(id, status) {
    await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_pin", id: id, is_pinned: status })
    });
    loadNotes();
}

async function searchNotes() {
    let text = document.getElementById("search").value;
    let response = await fetch(WORKER_URL + "?search=" + encodeURIComponent(text));
    currentNotesList = await response.json();
    applyFiltersAndRender();
}

async function editNote(id) {
    let note = currentNotesList.find(n => n.id == id);
    if (!note) return;

    document.getElementById("title").value = note.title;
    document.getElementById("text").value = note.content;
    
    if (document.getElementById("categorySelect")) {
        document.getElementById("categorySelect").value = note.category || "Заметки";
    }

    document.getElementById("isPinned").checked = note.is_pinned === 1 || note.is_pinned === true;
    document.getElementById("title").dataset.id = note.id;
    document.getElementById("formTitle").innerText = "Редактировать запись";
    document.getElementById("cancelEdit").style.display = "block";

    currentImageBase64 = note.image;
}

function cancelEdit() {
    document.getElementById("title").value = "";
    document.getElementById("text").value = "";
    if (document.getElementById("categorySelect")) document.getElementById("categorySelect").value = "Заметки";
    if (document.getElementById("imageInput")) document.getElementById("imageInput").value = "";
    if (document.getElementById("fileNameText")) document.getElementById("fileNameText").innerText = "Прикрепить фото";
    document.getElementById("isPinned").checked = false;
    delete document.getElementById("title").dataset.id;
    currentImageBase64 = null;

    document.getElementById("formTitle").innerText = "Новая запись";
    document.getElementById("cancelEdit").style.display = "none";
}

async function deleteNote(id) {
    let response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: id })
    });

    if (response.ok) {
        loadNotes();
    }
}

// =========================
// Модальное окно (Просмотр)
// =========================
function openNoteModal(id) {
    let note = currentNotesList.find(n => n.id == id);
    if (!note) return;

    document.getElementById("modalTitle").innerText = note.title;
    document.getElementById("modalText").innerText = note.content;

    let imgContainer = document.getElementById("modalImageContainer");
    if (note.image) {
        imgContainer.innerHTML = `<img src="${note.image}" alt="Фото">`;
        imgContainer.style.display = "flex";
    } else {
        imgContainer.innerHTML = "";
        imgContainer.style.display = "none";
    }

    let pinBadge = document.getElementById("modalPinBadge");
    const isPinned = note.is_pinned === 1 || note.is_pinned === true;
    const categoryName = note.category || "Заметки";

    if (pinBadge) {
        pinBadge.innerHTML = `
            <span class="category-badge">${categoryName === 'Скрипты' ? '📜 Скрипты' : '📝 Заметки'}</span>
            ${isPinned ? '<div class="pin-badge">📌 Закреплено</div>' : ''}
        `;
    }

    document.getElementById("noteModal").classList.add("active");
}

function closeNoteModal(e) {
    if (e && e.target !== e.currentTarget && !e.target.classList.contains('modal-close')) return;
    document.getElementById("noteModal").classList.remove("active");
}

// Глобальный доступ к функциям
window.login = login;
window.saveNote = saveNote;
window.deleteNote = deleteNote;
window.editNote = editNote;
window.searchNotes = searchNotes;
window.togglePin = togglePin;
window.cancelEdit = cancelEdit;
window.updateFileName = updateFileName;
window.openNoteModal = openNoteModal;
window.closeNoteModal = closeNoteModal;
window.filterByCategory = filterByCategory;
