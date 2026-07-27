const WORKER_URL = "https://my-password-check.minecraftpesok.workers.dev/";
let currentImageBase64 = null;
let currentNotesList = []; 
let activeCategory = "all"; 
let noteIdToDelete = null;

// Авторизация
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

// Сохранение
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

    if (id) {
        body.id = id;
    }

    try {
        let response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
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

// Загрузка
async function loadNotes() {
    try {
        let response = await fetch(WORKER_URL);
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

// Быстрое копирование скрипта/текста
function copyToClipboard(text, buttonEl) {
    navigator.clipboard.writeText(text).then(() => {
        let originalText = buttonEl.innerText;
        buttonEl.innerText = "✅ Скопировано!";
        setTimeout(() => {
            buttonEl.innerText = originalText;
        }, 1500);
    }).catch(err => console.error("Ошибка копирования: ", err));
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
                <button class="btn-action btn-copy" onclick="event.stopPropagation(); copyToClipboard(\`${note.content.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`, this)">
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

// Открытие модального окна просмотра
function openNoteModal(id) {
    let note = currentNotesList.find(n => n.id == id);
    if (!note) return;

    document.getElementById("modalTitle").innerText = note.title;
    document.getElementById("modalText").innerText = note.content;

    // Отрисовка Roblox кнопки в модальном окне
    let robloxContainer = document.getElementById("modalRobloxContainer");
    if (!robloxContainer) {
        // Если контейнера под кнопку еще нет в HTML, создаем его над текстом
        robloxContainer = document.createElement("div");
        robloxContainer.id = "modalRobloxContainer";
        document.getElementById("modalText").parentNode.insertBefore(robloxContainer, document.getElementById("modalText"));
    }

    if (note.roblox_url) {
        let url = note.roblox_url.startsWith("http") ? note.roblox_url : "https://" + note.roblox_url;
        robloxContainer.innerHTML = `
            <a href="${url}" target="_blank" class="roblox-link-btn">
                🎮 Открыть плейс в Roblox
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
        modalImg.src = "img/default.png";
        modalImg.onerror = () => { modalLeft.style.display = "none"; };
    }

    document.getElementById("modalOverlay").classList.add("active");
}

// Редактирование
function editNote(id) {
    let note = currentNotesList.find(n => n.id == id);
    if (!note) return;

    document.getElementById("title").value = note.title;
    document.getElementById("contentInput").value = note.content;
    
    if (document.getElementById("robloxUrl")) {
        document.getElementById("robloxUrl").value = note.roblox_url || "";
    }

    let catRadio = document.querySelector(`input[name="category"][value="${note.category || 'Заметки'}"]`);
    if (catRadio) catRadio.checked = true;

    if (document.getElementById("isPinned")) {
        document.getElementById("isPinned").checked = note.is_pinned === 1 || note.is_pinned === true;
    }

    document.getElementById("title").dataset.id = note.id;
    document.getElementById("formTitle").innerText = "Редактировать запись";
    document.getElementById("btnCancel").style.display = "block";

    currentImageBase64 = note.image;
}

// Сброс формы
function resetForm() {
    document.getElementById("title").value = "";
    document.getElementById("contentInput").value = "";
    if (document.getElementById("robloxUrl")) document.getElementById("robloxUrl").value = "";

    let defRadio = document.querySelector('input[name="category"][value="Заметки"]');
    if (defRadio) defRadio.checked = true;

    if (document.getElementById("imageInput")) document.getElementById("imageInput").value = "";
    if (document.getElementById("fileName")) document.getElementById("fileName").innerText = "Выберите фото";
    if (document.getElementById("isPinned")) document.getElementById("isPinned").checked = false;
    
    delete document.getElementById("title").dataset.id;
    currentImageBase64 = null;

    document.getElementById("formTitle").innerText = "Новая запись";
    document.getElementById("btnCancel").style.display = "none";
}

// Остальной стандартный код удалений/заклек
async function togglePin(id, status) {
    await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_pin", id: id, is_pinned: status })
    });
    loadNotes();
}

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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", id: noteIdToDelete })
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
