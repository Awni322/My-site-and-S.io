// Копирование из модалки
function copyModalContent() {
    let text = document.getElementById("modalText").innerText;
    let btn = document.getElementById("btnModalCopy");
    
    navigator.clipboard.writeText(text).then(() => {
        let orig = btn.innerHTML;
        btn.innerHTML = "✅ Скопировано!";
        setTimeout(() => { btn.innerHTML = orig; }, 1500);
    });
}

// Открытие модалки
function openNoteModal(id) {
    let note = currentNotesList.find(n => n.id == id);
    if (!note) return;

    document.getElementById("modalTitle").innerText = note.title;
    document.getElementById("modalText").innerText = note.content;

    // Roblox ссылка
    let robloxContainer = document.getElementById("modalRobloxContainer");
    if (robloxContainer) {
        if (note.roblox_url && note.roblox_url.trim() !== "") {
            let url = note.roblox_url.startsWith("http") ? note.roblox_url : "https://" + note.roblox_url;
            robloxContainer.innerHTML = `
                <a href="${url}" target="_blank" class="roblox-link-btn">
                    🎮 Открыть плейс в Roblox
                </a>
            `;
        } else {
            robloxContainer.innerHTML = "";
        }
    }

    // Фото
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
