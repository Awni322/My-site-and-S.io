const WORKER_URL = "https://my-password-check.minecraftpesok.workers.dev"; // Ваша ссылка на Worker

let allNotes = [];
let editingNoteId = null;
let currentBase64Image = null;
let currentFilter = "all";

// Авторизация
async function login() {
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            document.getElementById("login").style.display = "none";
            document.getElementById("content").style.display = "flex";
            loadNotes();
        } else {
            message.style.color = "#ef4444";
            message.innerText = "Неверный пароль!";
        }
    } catch (err) {
        message.style.color = "#ef4444";
        message.innerText = "Ошибка соединения с сервером.";
    }
}

// Загрузка заметок
async function loadNotes(searchQuery = "") {
    try {
        let url = WORKER_URL;
        if (searchQuery) {
            url += `?search=${encodeURIComponent(searchQuery)}`;
        }

        const response = await fetch(url);
        allNotes = await response.json();
        renderNotes();
    } catch (err) {
        console.error("Ошибка при загрузке заметок:", err);
    }
}

// Фильтрация заметок на клиенте
function filterCategory(category, event) {
    currentFilter = category;
    
    // Обновляем активность кнопок фильтров
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (event) {
        event.target.classList.add('active');
    }

    renderNotes();
}

// Поиск
function handleSearch() {
    const query = document.getElementById("search").value;
    loadNotes(query);
}

// Рендеринг списка заметок
function renderNotes() {
    const container = document.getElementById("notes");
    container.innerHTML = "";

    // Фильтруем по категории
    const filtered = allNotes.filter(note => {
        if (currentFilter === "all") return true;
        return (note.category || "Заметки") === currentFilter;
    });

    filtered.forEach(note => {
        const card = document.createElement("div");
        card.className = `note-card ${note.is_pinned ? "pinned" : ""}`;

        // Клики по карточке для открытия модалки
        card.onclick = (e) => {
            if (!e.target.classList.contains("btn-action")) {
                openModal(note);
            }
        };

        const categoryText = note.category || "Заметки";
        const categoryIcon = categoryText === "Скрипты" ? "📜" : "📝";

        let html = `
            ${note.is_pinned ? `<div class="pin-badge">📌 Закреплено</div>` : ""}
            <div class="category-badge">${categoryIcon} ${categoryText}</div>
            <h3 class="note-title">${escapeHtml(note.title)}</h3>
            <div class="note-content">${escapeHtml(note.content)}</div>
        `;

        if (note.image) {
            html += `
                <div class="note-image-container">
                    <img src="${note.image}" class="note-image" alt="Изображение">
                </div>
            `;
        }

        html += `
            <div class="note-actions">
                <button class="btn-action btn-pin ${note.is_pinned ? "active" : ""}" onclick="togglePin(${note.id}, ${note.is_pinned})">
                    ${note.is_pinned ? "Открепить" : "Закрепить"}
                </button>
                <button class="btn-action btn-edit" onclick="startEdit(${note.id})">Редактировать</button>
                <button class="btn-action btn-delete" onclick="deleteNote(${note.id})">Удалить</button>
            </div>
        `;

        card.innerHTML = html;
        container.appendChild(card);
    });
}

// Обработка загрузки изображения
function handleImageUpload(event) {
    const file = event.target.files[0];
    const fileNameSpan = document.getElementById("fileName");

    if (file) {
        fileNameSpan.innerText = file.name;
        const reader = new FileReader();
        reader.onloadend = () => {
            currentBase64Image = reader.result;
        };
        reader.readAsDataURL(file);
    } else {
        fileNameSpan.innerText = "Выберите фото";
        currentBase64Image = null;
    }
}

// Сохранение или обновление заметки
async function saveNote() {
    const title = document.getElementById("title").value.trim();
    const content = document.getElementById("contentInput").value.trim();
    
    // Новое считывание категории с radio-переключателей
    const category = document.querySelector('input[name="category"]:checked')?.value || "Заметки";
    const isPinned = document.getElementById("isPinned").checked;

    if (!title && !content) {
        alert("Заполните заголовок или текст заметки!");
        return;
    }

    const payload = {
        action: editingNoteId ? "edit" : "save",
        id: editingNoteId,
        title,
        content,
        category,
        image: currentBase64Image,
        is_pinned: isPinned
    };

    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            resetForm();
            loadNotes();
        } else {
            alert("Ошибка при сохранении!");
        }
    } catch (err) {
        console.error("Ошибка сохранения:", err);
    }
}

// Редактирование
function startEdit(id) {
    const note = allNotes.find(n => n.id === id);
    if (!note) return;

    editingNoteId = note.id;
    document.getElementById("formTitle").innerText = "Редактировать запись";
    document.getElementById("title").value = note.title || "";
    document.getElementById("contentInput").value = note.content || "";
    
    // Выбор нужной категории в переключателе
    const categoryRadio = document.querySelector(`input[name="category"][value="${note.category || "Заметки"}"]`);
    if (categoryRadio) categoryRadio.checked = true;

    document.getElementById("isPinned").checked = !!note.is_pinned;
    document.getElementById("btnCancel").style.display = "block";

    currentBase64Image = note.image || null;
    document.getElementById("fileName").innerText = note.image ? "Изображение прикреплено" : "Выберите фото";
}

// Сброс формы
function resetForm() {
    editingNoteId = null;
    document.getElementById("formTitle").innerText = "Новая запись";
    document.getElementById("title").value = "";
    document.getElementById("contentInput").value = "";
    
    // Возврат переключателя на "Заметки" по умолчанию
    const defaultRadio = document.querySelector('input[name="category"][value="Заметки"]');
    if (defaultRadio) defaultRadio.checked = true;

    document.getElementById("isPinned").checked = false;
    document.getElementById("imageInput").value = "";
    document.getElementById("fileName").innerText = "Выберите фото";
    document.getElementById("btnCancel").style.display = "none";
    currentBase64Image = null;
}

// Закрепление / Открепление
async function togglePin(id, currentPinnedState) {
    try {
        await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "toggle_pin",
                id,
                is_pinned: !currentPinnedState
            })
        });
        loadNotes();
    } catch (err) {
        console.error("Ошибка переключения закрепа:", err);
    }
}

// Удаление
async function deleteNote(id) {
    if (!confirm("Вы уверены, что хотите удалить эту запись?")) return;

    try {
        await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", id })
        });
        loadNotes();
    } catch (err) {
        console.error("Ошибка удаления:", err);
    }
}

// Модальное окно просмотра
function openModal(note) {
    const overlay = document.getElementById("modalOverlay");
    const modalImage = document.getElementById("modalImage");
    const modalLeft = document.getElementById("modalLeft");

    document.getElementById("modalTitle").innerText = note.title || "Без названия";
    document.getElementById("modalText").innerText = note.content || "";

    if (note.image) {
        modalImage.src = note.image;
        modalLeft.style.display = "flex";
    } else {
        modalLeft.style.display = "none";
    }

    overlay.classList.add("active");
}

function closeModal() {
    document.getElementById("modalOverlay").classList.remove("active");
}

// Вспомогательная функция для безопасности вывода HTML
function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
