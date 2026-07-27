const WORKER_URL = "https://my-password-check.minecraftpesok.workers.dev/";
let currentImageBase64 = null; // Переменная для хранения фото при редактировании

// Вход
async function login() {
    let password = document.getElementById("password").value;
    let message = document.getElementById("message");
    message.innerHTML = "Проверка...";

    let response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password })
    });

    if (response.ok) {
        message.innerHTML = "✅ Пароль верный";
        message.style.color = "green";
        document.getElementById("login").style.display = "none";
        document.getElementById("content").style.display = "block";
        loadNotes();
    } else {
        message.innerHTML = "❌ Неверный пароль";
        message.style.color = "red";
    }
}

// Преобразование файла в Base64
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Сохранение / Изменение записи
async function saveNote() {
    let title = document.getElementById("title").value;
    let text = document.getElementById("text").value;
    let isPinned = document.getElementById("isPinned").checked;
    let imageInput = document.getElementById("imageInput");

    if (!title || !text) {
        alert("Заполни название и текст");
        return;
    }

    let id = document.getElementById("title").dataset.id;
    let action = id ? "edit" : "save";

    let imageBase64 = currentImageBase64;
    if (imageInput.files[0]) {
        imageBase64 = await getBase64(imageInput.files[0]);
    }

    let body = {
        action: action,
        title: title,
        content: text,
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

// Загрузка записей
async function loadNotes() {
    let response = await fetch(WORKER_URL);
    let notes = await response.json();
    renderNotes(notes);
}

// Рендеринг записей
function renderNotes(notes) {
    let output = "";

    notes.forEach(note => {
        const pinText = note.is_pinned ? "📌 Открепить" : "📌 Закрепить";
        const pinBadge = note.is_pinned ? " [ЗАКРЕПЛЕНО]" : "";

        output += `
        <div style="border:1px solid #ccc; padding:10px; margin-bottom:10px; ${note.is_pinned ? 'background:#f0f8ff;' : ''}">
            <h3>${note.title}${pinBadge}</h3>
            <p>${note.content}</p>
            ${note.image ? `<img src="${note.image}" style="max-width:300px; display:block; margin-bottom:10px;">` : ""}
            
            <button onclick="togglePin(${note.id}, ${!note.is_pinned})">${pinText}</button>
            <button onclick="editNote(${note.id})">✏️ Изменить</button>
            <button onclick="deleteNote(${note.id})">🗑 Удалить</button>
        </div>
        `;
    });

    document.getElementById("notes").innerHTML = output;
}

// Переключение закрепления
async function togglePin(id, status) {
    await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_pin", id: id, is_pinned: status })
    });
    loadNotes();
}

// Поиск
async function searchNotes() {
    let text = document.getElementById("search").value;
    let response = await fetch(WORKER_URL + "?search=" + encodeURIComponent(text));
    let notes = await response.json();
    renderNotes(notes);
}

// Редактирование
async function editNote(id) {
    let response = await fetch(WORKER_URL);
    let notes = await response.json();
    let note = notes.find(n => n.id == id);

    if (!note) return;

    document.getElementById("title").value = note.title;
    document.getElementById("text").value = note.content;
    document.getElementById("isPinned").checked = note.is_pinned === 1;
    document.getElementById("title").dataset.id = note.id;
    document.getElementById("formTitle").innerText = "Редактировать запись";
    document.getElementById("cancelEdit").style.display = "inline";

    currentImageBase64 = note.image;
}

// Сброс формы
function cancelEdit() {
    document.getElementById("title").value = "";
    document.getElementById("text").value = "";
    document.getElementById("imageInput").value = "";
    document.getElementById("isPinned").checked = false;
    delete document.getElementById("title").dataset.id;
    currentImageBase64 = null;

    document.getElementById("formTitle").innerText = "Новая запись";
    document.getElementById("cancelEdit").style.display = "none";
}

// Удаление
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

window.login = login;
window.saveNote = saveNote;
window.deleteNote = deleteNote;
window.editNote = editNote;
window.searchNotes = searchNotes;
window.togglePin = togglePin;
window.cancelEdit = cancelEdit;
