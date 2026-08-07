const WORKER_URL = "https://my-password-check.minecraftpesok.workers.dev/";

let currentImageBase64 = null;
let currentAvatarBase64 = null;
let currentNotesList = [];
let activeCategory = "all";
let activeSort = "newest";
let noteIdToDelete = null;
let currentUser = null;

// Игровые данные
let userBalance = 100;
let userBestWin = 0;
let userTotalWon = 0;
let userInventory = [];
let lastWheelSpin = 0;
let selectedSlot1 = null;
let selectedSlot2 = null;
let activeLeaderboard = 'balance';
let currentAvatarFile = null; // Для хранения файла аватарки при смене

// Скины из CS2 (оружие и ножи)
const CS2_SKINS = {
    // Пистолеты
    gp25_glock18: { id: 'gp25_glock18', name: 'Glock-18 | Grotto', icon: '🔫', price: 150, type: 'weapon', rarity: 'consumer' },
    p90_p90: { id: 'p90_p90', name: 'P90 | Asiimov', icon: '🔫', price: 200, type: 'weapon', rarity: 'milspec' },
    // Винтовки
    ak47_ak47: { id: 'ak47_ak47', name: 'AK-47 | Slate', icon: '🪖', price: 350, type: 'weapon', rarity: 'milspec' },
    m4a1_m4a1: { id: 'm4a1_m4a1', name: 'M4A1-S | Cyberopsis', icon: '🪖', price: 400, type: 'weapon', rarity: 'restricted' },
    // Снайперские винтовки
    awp_awp: { id: 'awp_awp', name: 'AWP | Atheris', icon: '🎯', price: 600, type: 'weapon', rarity: 'covert' },
    // Ножи
    knife_bayonet: { id: 'knife_bayonet', name: 'Bayonet | Doppler', icon: '🔪', price: 1500, type: 'knife', rarity: 'classified' },
    knife_flip: { id: 'knife_flip', name: 'Flip Knife | Fade', icon: '🔪', price: 2000, type: 'knife', rarity: 'covert' },
    knife_gut: { id: 'knife_gut', name: 'Gut Knife | Fade', icon: '🔪', price: 1800, type: 'knife', rarity: 'covert' },
    knife_karambit: { id: 'knife_karambit', name: 'Karambit | Fade', icon: '🔪', price: 2500, type: 'knife', rarity: 'Covert' },
    knife_m9: { id: 'knife_m9', name: 'M9 Bayonet | Fade', icon: '🔪', price: 2200, type: 'knife', rarity: 'covert' }
};

// Предметы для апгрейдера (микроконтейнеры)
const ITEMS = {
    common1: { id: 'common1', name: 'Малый контейнер', icon: '📦', price: 50, tier: 1 },
    common2: { id: 'common2', name: 'Средний контейнер', icon: '📦', price: 80, tier: 1 },
    common3: { id: 'common3', name: 'Большой контейнер', icon: '📦', price: 120, tier: 1 },

    rare1: { id: 'rare1', name: 'Элитный контейнер', icon: '🎒', price: 250, tier: 2 },
    rare2: { id: 'rare2', name: 'Эпический контейнер', icon: '🎒', price: 350, tier: 2 },
    rare3: { id: 'rare3', name: 'Секретный контейнер', icon: '🎒', price: 500, tier: 2 },

    epic1: { id: 'epic1', name: 'Магический контейнер', icon: '🎁', price: 1000, tier: 3 },
    epic2: { id: 'epic2', name: 'Легендарный контейнер', icon: '🎁', price: 1500, tier: 3 },
    epic3: { id: 'epic3', name: 'Мифический контейнер', icon: '🎁', price: 2000, tier: 3 },

    legendary1: { id: 'legendary1', name: 'Божественный контейнер', icon: '✨', price: 3500, tier: 4 },
    legendary2: { id: 'legendary2', name: 'Великий контейнер', icon: '✨', price: 4000, tier: 4 },
    legendary3: { id: 'legendary3', name: 'Таинственный контейнер', icon: '✨', price: 5000, tier: 4 }
};

// Возможные апгрейды (с какого на какой и с каким шансом)
const UPGRADES = {
    common1: { to: 'rare1', chance: 60 },
    common2: { to: 'rare2', chance: 55 },
    common3: { to: 'rare3', chance: 50 },

    rare1: { to: 'epic1', chance: 30 },
    rare2: { to: 'epic2', chance: 25 },
    rare3: { to: 'epic3', chance: 20 },

    epic1: { to: 'legendary1', chance: 10 },
    epic2: { to: 'legendary2', chance: 8 },
    epic3: { to: 'legendary3', chance: 5 }
};

// Призы колеса фортуны
const wheelPrizes = [
    { name: "50 монет", coins: 50 },
    { name: "100 монет", coins: 100 },
    { name: "Перекрутка", coins: 0, reroll: true },
    { name: "200 монет", coins: 200 },
    { name: "Пусто", coins: 0 },
    { name: "3 прокрута", coins: 0, spins: 3 },
    { name: "500 монет", coins: 500 },
    { name: "Пусто", coins: 0 }
];

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

    currentAvatarFile = file;

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

// Обработка загрузки новой аватарки в профиле
function handleNewAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    currentAvatarFile = file;

    const reader = new FileReader();
    reader.onload = function(event) {
        const preview = document.getElementById("avatarPreviewChange");
        if (preview) {
            preview.innerHTML = `<img src="${event.target.result}" alt="Avatar">`;
        }
    };
    reader.readAsDataURL(file);
}

// Сброс аватарки
function resetAvatar() {
    currentAvatarBase64 = null;
    currentAvatarFile = null;
    const preview = document.getElementById("avatarPreview");
    const resetBtn = document.getElementById("resetAvatarBtn");
    const input = document.getElementById("avatarInput");
    const previewChange = document.getElementById("avatarPreviewChange");
    const resetNewBtn = document.getElementById("resetNewAvatarBtn");
    const newInput = document.getElementById("newAvatarInput");

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

    // Сброс аватарки в профиле
    if (previewChange) {
        previewChange.innerHTML = `
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="40" fill="#4a5568"/>
                <circle cx="40" cy="30" r="12" fill="#718096"/>
                <path d="M20 65C20 55 28 50 40 50C52 50 60 55 60 65" fill="#718096"/>
            </svg>
        `;
    }
    if (resetNewBtn) {
        resetNewBtn.style.display = "none";
    }
    if (newInput) {
        newInput.value = "";
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
                loadGameData();
                loadLeaderboard();
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
                loadGameData();
                loadLeaderboard();
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

    // Сохраняем аватарку в localStorage
    if (currentUser.avatar) {
        localStorage.setItem("user_avatar", currentUser.avatar);
    }

    if (avatarEl) {
        if (currentUser.avatar) {
            avatarEl.src = currentUser.avatar;
        } else {
            // Генерируем SVG-аватар на основе первых букв имени
            const initials = (currentUser.displayName || currentUser.username).split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
            avatarEl.src = "data:image/svg+xml," + encodeURIComponent(`
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="18" cy="18" r="18" fill="#4a5568"/>
                    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="white" font-weight="bold">${initials}</text>
                </svg>
            `);
        }
    }

    if (displayNameEl) {
        displayNameEl.textContent = currentUser.displayName;
    }
}

// Загрузка сохранённой аватарки из localStorage
function loadSavedAvatar() {
    const savedAvatar = localStorage.getItem("user_avatar");
    if (savedAvatar && currentUser) {
        currentUser.avatar = savedAvatar;
    }
}

// Открытие настроек профиля
function openProfileSettings() {
    const overlay = document.getElementById("profileSettingsOverlay");
    if (overlay) {
        overlay.classList.add("active");
        // Очищаем поля
        document.getElementById("nameChangePassword").value = "";
        document.getElementById("newDisplayName").value = "";
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";
        document.getElementById("nameChangeMessage").innerHTML = "";
        document.getElementById("passwordChangeMessage").innerHTML = "";
    }
}

// Закрытие настроек профиля
function closeProfileSettings() {
    const overlay = document.getElementById("profileSettingsOverlay");
    if (overlay) {
        overlay.classList.remove("active");
    }
}

// Изменение отображаемого имени
async function changeDisplayName() {
    const password = document.getElementById("nameChangePassword").value;
    const newDisplayName = document.getElementById("newDisplayName").value.trim();
    const message = document.getElementById("nameChangeMessage");

    if (!password || !newDisplayName) {
        message.innerHTML = "⚠️ Заполните все поля";
        message.style.color = "#fbbf24";
        return;
    }

    if (newDisplayName.length < 2) {
        message.innerHTML = "⚠️ Имя должно быть не менее 2 символов";
        message.style.color = "#fbbf24";
        return;
    }

    message.innerHTML = "Изменение...";
    message.style.color = "#ffffff";

    try {
        const response = await fetch(WORKER_URL + "profile/change-name", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                password,
                newDisplayName
            }),
            credentials: "include"
        });

        const data = await response.json();

        if (response.ok) {
            message.innerHTML = "✅ Имя изменено!";
            message.style.color = "#4ade80";
            currentUser.displayName = newDisplayName;
            updateUserProfile();

            setTimeout(() => {
                document.getElementById("nameChangePassword").value = "";
                document.getElementById("newDisplayName").value = "";
                message.innerHTML = "";
            }, 2000);
        } else {
            message.innerHTML = `❌ ${data.error === "Invalid password" ? "Неверный пароль" : "Ошибка изменения имени"}`;
            message.style.color = "#f87171";
        }
    } catch (e) {
        message.innerHTML = "❌ Ошибка соединения";
        message.style.color = "#f87171";
    }
}

// Изменение пароля
async function changePassword() {
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const message = document.getElementById("passwordChangeMessage");

    if (!currentPassword || !newPassword || !confirmPassword) {
        message.innerHTML = "⚠️ Заполните все поля";
        message.style.color = "#fbbf24";
        return;
    }

    if (newPassword.length < 6) {
        message.innerHTML = "⚠️ Новый пароль должен быть не менее 6 символов";
        message.style.color = "#fbbf24";
        return;
    }

    if (newPassword !== confirmPassword) {
        message.innerHTML = "⚠️ Пароли не совпадают";
        message.style.color = "#fbbf24";
        return;
    }

    message.innerHTML = "Изменение...";
    message.style.color = "#ffffff";

    try {
        const response = await fetch(WORKER_URL + "profile/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                currentPassword,
                newPassword
            }),
            credentials: "include"
        });

        const data = await response.json();

        if (response.ok) {
            message.innerHTML = "✅ Пароль изменен!";
            message.style.color = "#4ade80";

            setTimeout(() => {
                document.getElementById("currentPassword").value = "";
                document.getElementById("newPassword").value = "";
                document.getElementById("confirmPassword").value = "";
                message.innerHTML = "";
            }, 2000);
        } else {
            message.innerHTML = `❌ ${data.error === "Invalid password" ? "Неверный текущий пароль" : "Ошибка изменения пароля"}`;
            message.style.color = "#f87171";
        }
    } catch (e) {
        message.innerHTML = "❌ Ошибка соединения";
        message.style.color = "#f87171";
    }
}

// Загрузка игровых данных
async function loadGameData() {
    try {
        const response = await fetch(WORKER_URL + "game/data", {
            method: "GET",
            credentials: "include"
        });

        if (response.ok) {
            const data = await response.json();
            userBalance = data.balance;
            userBestWin = data.bestWin;
            userTotalWon = data.totalWon;
            lastWheelSpin = data.lastWheelSpin;

            // Преобразуем items в удобный формат
            userInventory = {};
            data.items.forEach(item => {
                userInventory[item.item_id] = item.quantity;
            });

            updateGameUI();
            checkWheelCooldown();
            renderInventory();
        }
    } catch (err) {
        console.error("Ошибка загрузки игровых данных:", err);
    }
}

// Обновление UI игр
function updateGameUI() {
    const balanceEl = document.getElementById("userBalance");
    const bestWinEl = document.getElementById("bestWin");
    const totalWonEl = document.getElementById("totalWon");

    if (balanceEl) balanceEl.textContent = userBalance;
    if (bestWinEl) bestWinEl.textContent = `${userBestWin} 🪙`;
    if (totalWonEl) totalWonEl.textContent = `${userTotalWon} 🪙`;
}

// Проверка кулдауна колеса
function checkWheelCooldown() {
    const now = Math.floor(Date.now() / 1000);
    const timeSinceLastSpin = now - lastWheelSpin;
    const cooldown = 3600; // 1 час

    const wheelBtn = document.getElementById("spinWheelBtn");
    const wheelTimer = document.getElementById("wheelTimer");
    const wheelTimeLeft = document.getElementById("wheelTimeLeft");

    if (timeSinceLastSpin < cooldown) {
        const timeLeft = cooldown - timeSinceLastSpin;
        if (wheelBtn) wheelBtn.disabled = true;
        if (wheelTimer) wheelTimer.style.display = "block";

        updateWheelTimer(timeLeft);

        // Обновляем таймер каждую секунду
        const interval = setInterval(() => {
            const newTimeLeft = cooldown - (Math.floor(Date.now() / 1000) - lastWheelSpin);
            if (newTimeLeft <= 0) {
                clearInterval(interval);
                if (wheelBtn) wheelBtn.disabled = false;
                if (wheelTimer) wheelTimer.style.display = "none";
            } else {
                updateWheelTimer(newTimeLeft);
            }
        }, 1000);
    } else {
        if (wheelBtn) wheelBtn.disabled = false;
        if (wheelTimer) wheelTimer.style.display = "none";
    }
}

function updateWheelTimer(seconds) {
    const wheelTimeLeft = document.getElementById("wheelTimeLeft");
    if (!wheelTimeLeft) return;

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    wheelTimeLeft.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Смена аватарки без пароля
async function changeAvatar() {
    const message = document.getElementById("avatarChangeMessage");

    if (!currentAvatarFile) {
        message.innerHTML = "⚠️ Выберите файл аватарки";
        message.style.color = "#fbbf24";
        return;
    }

    message.innerHTML = "Загрузка...";
    message.style.color = "#ffffff";

    try {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const response = await fetch(WORKER_URL + "profile/change-avatar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        avatar: e.target.result
                    }),
                    credentials: "include"
                });

                const data = await response.json();

                if (response.ok) {
                    message.innerHTML = "✅ Аватарка изменена!";
                    message.style.color = "#4ade80";
                    currentUser.avatar = e.target.result;
                    updateUserProfile();

                    // Перезагружаем заметки, чтобы обновить аватарки
                    loadNotes();

                    setTimeout(() => {
                        document.getElementById("avatarPreviewChange").innerHTML = `
                            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="40" cy="40" r="40" fill="#4a5568"/>
                                <circle cx="40" cy="30" r="12" fill="#718096"/>
                                <path d="M20 65C20 55 28 50 40 50C52 50 60 55 60 65" fill="#718096"/>
                            </svg>
                        `;
                        currentAvatarFile = null;
                        document.getElementById("avatarChangeMessage").innerHTML = "";
                    }, 2000);
                } else {
                    message.innerHTML = `❌ Ошибка изменения аватарки`;
                    message.style.color = "#f87171";
                }
            } catch (err) {
                message.innerHTML = "❌ Ошибка соединения";
                message.style.color = "#f87171";
            }
        };
        reader.readAsDataURL(currentAvatarFile);
    } catch (err) {
        message.innerHTML = "❌ Ошибка загрузки";
        message.style.color = "#f87171";
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

// Обработка загрузки новой аватарки для превью
function handleNewAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    currentAvatarFile = file;

    const reader = new FileReader();
    reader.onload = function(event) {
        const preview = document.getElementById("avatarPreviewChange");
        if (preview) {
            preview.innerHTML = `<img src="${event.target.result}" alt="Avatar">`;
        }
    };
    reader.readAsDataURL(file);
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

        const authorName = escapeHtml(note.author_name || "Аноним");
        const authorAvatar = (note.author_avatar && note.author_avatar.startsWith("data:image/"))
            ? note.author_avatar
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
                    ${authorAvatar ? `<img src="${authorAvatar}" class="note-author-avatar" alt="Avatar">` : `
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="note-author-avatar">
                            <circle cx="12" cy="12" r="12" fill="#4a5568"/>
                            <circle cx="12" cy="9" r="3.5" fill="#718096"/>
                            <path d="M6 19C6 16 8.5 14.5 12 14.5C15.5 14.5 18 16 18 19" fill="#718096"/>
                        </svg>
                    `}
                    <span class="note-author-name">${authorName}</span>
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

            // Загружаем сохранённую аватарку из localStorage
            const savedAvatar = localStorage.getItem("user_avatar");
            if (savedAvatar) {
                currentUser.avatar = savedAvatar;
            }

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
            loadGameData();
            loadLeaderboard();
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
    const arrow = document.getElementById("gamesArrowBtn");
    if (panel) panel.classList.add("active");
    if (arrow) arrow.style.display = "none";
}

function closeGamesPanel() {
    const panel = document.getElementById("gamesPanel");
    const arrow = document.getElementById("gamesArrowBtn");
    if (panel) panel.classList.remove("active");
    if (arrow) arrow.style.display = "flex";
}

// ─── Колесо фортуны ─────────────────────────────────────────
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
    const segAngle = (2 * Math.PI) / wheelPrizes.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    wheelPrizes.forEach((prize, i) => {
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
        ctx.font = "600 12px Inter, sans-serif";
        ctx.fillText(prize.name, radius - 14, 5);
        ctx.restore();
    });
}

async function spinWheel() {
    if (wheelSpinning) return;
    const canvas = document.getElementById("wheelCanvas");
    const resultEl = document.getElementById("wheelResult");
    const wheelBtn = document.getElementById("spinWheelBtn");
    if (!canvas) return;

    wheelSpinning = true;
    if (resultEl) resultEl.textContent = "";
    if (wheelBtn) wheelBtn.disabled = true;

    const segAngle = 360 / wheelPrizes.length;
    const winIndex = Math.floor(Math.random() * wheelPrizes.length);
    const targetCenter = winIndex * segAngle + segAngle / 2;

    let needed = (270 - targetCenter) % 360;
    if (needed < 0) needed += 360;

    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const currentMod = ((currentWheelRotation % 360) + 360) % 360;
    currentWheelRotation += extraSpins * 360 + ((needed - currentMod) + 360) % 360;

    canvas.style.transform = `rotate(${currentWheelRotation}deg)`;

    setTimeout(async () => {
        wheelSpinning = false;
        const prize = wheelPrizes[winIndex];

        // Обрабатываем приз
        let coins = prize.coins || 0;
        let message = "";

        if (prize.reroll) {
            message = "Перекрутка! Крути еще раз бесплатно!";
            if (wheelBtn) wheelBtn.disabled = false;
        } else if (prize.spins) {
            message = `${prize.spins} прокрута! Крути еще ${prize.spins} раз!`;
            if (wheelBtn) wheelBtn.disabled = false;
        } else if (coins > 0) {
            message = `Выпало: ${prize.name}! +${coins} 🪙`;
        } else {
            message = "Пусто! Попробуй через час.";
        }

        if (resultEl) resultEl.textContent = message;

        // Отправляем результат на сервер
        try {
            const response = await fetch(WORKER_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "spin_wheel",
                    prize: prize.name,
                    amount: coins
                }),
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                userBalance = data.newBalance;
                userBestWin = data.bestWin;
                userTotalWon = data.totalWon;
                updateGameUI();

                if (!prize.reroll && !prize.spins) {
                    lastWheelSpin = Math.floor(Date.now() / 1000);
                    checkWheelCooldown();
                }

                if (coins > 0) {
                    showToast(`+${coins} 🪙 монет!`);
                }
            }
        } catch (err) {
            console.error("Ошибка при вращении колеса:", err);
        }
    }, 4600);
}

// ─── Апгрейдер ──────────────────────────────────────────────
function renderInventory() {
    const grid = document.getElementById("inventoryGrid");
    if (!grid) return;

    grid.innerHTML = "";

    // Добавляем все предметы (CS2 скины + контейнеры)
    Object.values(ITEMS).forEach(item => {
        const quantity = userInventory[item.id] || 0;
        if (quantity > 0) {
            const itemEl = document.createElement("div");
            itemEl.className = "inventory-item";
            itemEl.innerHTML = `
                <div class="inventory-item-icon">${item.icon}</div>
                <div class="inventory-item-name">${item.name}</div>
                <div class="inventory-item-price">${item.price} 🪙</div>
                ${quantity > 1 ? `<div class="inventory-item-count">${quantity}</div>` : ''}
            `;

            // Клик для выбора предмета
            itemEl.onclick = (e) => {
                if (!e.target.classList.contains('inventory-item-sell')) {
                    selectInventoryItem(item.id);
                }
            };

            // Кнопка продажи
            const sellBtn = document.createElement("button");
            sellBtn.className = "inventory-item-sell";
            sellBtn.textContent = `Продать (${Math.floor(item.price * 0.5)}🪙)`;
            sellBtn.onclick = (e) => {
                e.stopPropagation();
                sellItem(item.id);
            };
            itemEl.appendChild(sellBtn);

            grid.appendChild(itemEl);
        }
    });

    // Показываем кнопки покупки для скинов CS2
    const hasNoItems = Object.keys(userInventory).length === 0 ||
                       Object.values(userInventory).every(q => q === 0);

    if (hasNoItems) {
        // Показываем 6 популярных скинов для покупки
        const buyItems = [
            CS2_SKINS.gp25_glock18,
            CS2_SKINS.p90_p90,
            CS2_SKINS.ak47_ak47,
            CS2_SKINS.knife_bayonet,
            CS2_SKINS.knife_flip,
            CS2_SKINS.knife_gut
        ];

        buyItems.forEach(item => {
            const itemEl = document.createElement("div");
            itemEl.className = "inventory-item inventory-item-buy";
            itemEl.onclick = () => buyItem(item.id);
            itemEl.innerHTML = `
                <div class="inventory-item-icon">${item.icon}</div>
                <div class="inventory-item-name">Купить</div>
                <div class="inventory-item-price">${item.price} 🪙</div>
            `;
            grid.appendChild(itemEl);
        });
    }
}

async function sellItem(itemId) {
    const item = ITEMS[itemId];
    if (!item || !userInventory[itemId] || userInventory[itemId] === 0) {
        showToast("❌ У вас нет этого предмета", "error");
        return;
    }

    const sellPrice = Math.floor(item.price * 0.5);

    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "sell_item",
                itemId: itemId,
                price: sellPrice
            }),
            credentials: "include"
        });

        if (response.ok) {
            userBalance += sellPrice;
            userInventory[itemId] = (userInventory[itemId] || 1) - 1;
            if (userInventory[itemId] <= 0) {
                delete userInventory[itemId];
            }
            updateGameUI();
            renderInventory();
            showToast(`✅ Продано за ${sellPrice} 🪙`);
        }
    } catch (err) {
        console.error("Ошибка продажи:", err);
        showToast("❌ Ошибка продажи", "error");
    }
}

async function buyItem(itemId) {
    const item = ITEMS[itemId];
    if (!item) return;

    if (userBalance < item.price) {
        showToast("❌ Недостаточно монет", "error");
        return;
    }

    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "buy_item",
                itemId: itemId,
                price: item.price
            }),
            credentials: "include"
        });

        if (response.ok) {
            userBalance -= item.price;
            userInventory[itemId] = (userInventory[itemId] || 0) + 1;
            updateGameUI();
            renderInventory();
            showToast(`✅ Куплен: ${item.name}`);
        }
    } catch (err) {
        console.error("Ошибка покупки:", err);
        showToast("❌ Ошибка покупки", "error");
    }
}

function selectInventoryItem(itemId) {
    const item = ITEMS[itemId];
    if (!item || !userInventory[itemId] || userInventory[itemId] === 0) return;

    if (!selectedSlot1) {
        selectedSlot1 = itemId;
        updateUpgraderSlot(1, item);
    } else if (!selectedSlot2) {
        // Если это контейнер - открываем его (выдаём случайный предмет)
        if (item.type === 'container' || item.name.includes('контейнер')) {
            showToast("📦 Контейнер открыт! Случайный предмет добавлен в инвентарь", "success");
            // Выдаём случайный скин
            const randomSkins = [
                CS2_SKINS.gp25_glock18, CS2_SKINS.p90_p90,
                CS2_SKINS.ak47_ak47, CS2_SKINS.m4a1_m4a1, CS2_SKINS.awp_awp,
                CS2_SKINS.knife_bayonet, CS2_SKINS.knife_flip, CS2_SKINS.knife_gut
            ];
            const randomSkin = randomSkins[Math.floor(Math.random() * randomSkins.length)];
            userInventory[randomSkin.id] = (userInventory[randomSkin.id] || 0) + 1;

            // Удаляем контейнер
            userInventory[itemId] = (userInventory[itemId] || 1) - 1;
            if (userInventory[itemId] <= 0) delete userInventory[itemId];

            selectedSlot1 = null;
            updateUpgraderSlot(1, null);
            updateUpgraderSlot(2, null);
            renderInventory();
            updateGameUI();
            return;
        }

        // Для апгрейда
        if (UPGRADES[selectedSlot1] && UPGRADES[selectedSlot1].to === itemId) {
            showToast("❌ Нельзя выбрать целевой предмет", "error");
            return;
        }
        selectedSlot2 = itemId;
        updateUpgraderSlot(2, item);
    } else {
        // Сбрасываем выбор
        selectedSlot1 = itemId;
        selectedSlot2 = null;
        updateUpgraderSlot(1, item);
        updateUpgraderSlot(2, null);
    }

    calculateUpgradeChance();
}

function selectUpgraderSlot(slotNum) {
    if (slotNum === 1) {
        selectedSlot1 = null;
        selectedSlot2 = null;
        updateUpgraderSlot(1, null);
        updateUpgraderSlot(2, null);
        calculateUpgradeChance();
    } else if (slotNum === 2) {
        selectedSlot2 = null;
        updateUpgraderSlot(2, null);
        calculateUpgradeChance();
    }
}

function updateUpgraderSlot(slotNum, item) {
    const slot = document.getElementById(`upgraderSlot${slotNum}`);
    if (!slot) return;

    if (item) {
        slot.innerHTML = `
            <div class="slot-item">
                <div class="slot-item-icon">${item.icon}</div>
                <div class="slot-item-name">${item.name}</div>
                <div class="slot-item-price">${item.price} 🪙</div>
            </div>
        `;
        slot.classList.add("selected");
    } else {
        slot.innerHTML = `<div class="slot-empty">Выбери предмет</div>`;
        slot.classList.remove("selected");
    }
}

function calculateUpgradeChance() {
    const chanceEl = document.getElementById("chancePercent");
    const upgradeBtn = document.getElementById("upgradeBtn");
    const chanceCircle = document.querySelector(".chance-circle");

    if (!selectedSlot1 || !UPGRADES[selectedSlot1]) {
        if (chanceEl) chanceEl.textContent = "0%";
        if (upgradeBtn) upgradeBtn.disabled = true;
        if (chanceCircle) chanceCircle.style.background = "conic-gradient(var(--accent-color) 0% 0%, var(--border-color-solid) 0% 100%)";

        // Автоматически показываем целевой предмет
        if (selectedSlot1 && UPGRADES[selectedSlot1]) {
            const targetItem = ITEMS[UPGRADES[selectedSlot1].to];
            updateUpgraderSlot(2, targetItem);
        }
        return;
    }

    const upgrade = UPGRADES[selectedSlot1];
    const targetItem = ITEMS[upgrade.to];

    // Показываем целевой предмет
    updateUpgraderSlot(2, targetItem);

    const chance = upgrade.chance;
    if (chanceEl) chanceEl.textContent = `${chance}%`;
    if (upgradeBtn) upgradeBtn.disabled = false;

    if (chanceCircle) {
        const percent = chance;
        chanceCircle.style.background = `conic-gradient(var(--accent-color) 0% ${percent}%, var(--border-color-solid) ${percent}% 100%)`;
    }
}

async function performUpgrade() {
    if (!selectedSlot1 || !UPGRADES[selectedSlot1]) {
        showToast("❌ Выбери предмет для улучшения", "error");
        return;
    }

    const upgrade = UPGRADES[selectedSlot1];
    const fromItem = ITEMS[selectedSlot1];
    const toItem = ITEMS[upgrade.to];
    const chance = upgrade.chance;

    // Проверяем наличие предмета
    if (!userInventory[selectedSlot1] || userInventory[selectedSlot1] === 0) {
        showToast("❌ У вас нет этого предмета", "error");
        return;
    }

    // Рандомим успех
    const random = Math.random() * 100;
    const success = random < chance;

    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "upgrade",
                fromItem: selectedSlot1,
                toItem: upgrade.to,
                success: success
            }),
            credentials: "include"
        });

        if (response.ok) {
            // Обновляем локальный инвентарь
            userInventory[selectedSlot1] = (userInventory[selectedSlot1] || 1) - 1;
            if (userInventory[selectedSlot1] <= 0) {
                delete userInventory[selectedSlot1];
            }

            if (success) {
                userInventory[upgrade.to] = (userInventory[upgrade.to] || 0) + 1;
                showToast(`✅ Успех! Получен ${toItem.name}`);
            } else {
                showToast(`❌ Провал! Предмет утерян`, "error");
            }

            // Сбрасываем выбор
            selectedSlot1 = null;
            selectedSlot2 = null;
            updateUpgraderSlot(1, null);
            updateUpgraderSlot(2, null);
            calculateUpgradeChance();
            renderInventory();
        }
    } catch (err) {
        console.error("Ошибка апгрейда:", err);
        showToast("❌ Ошибка апгрейда", "error");
    }
}

// ─── Лидерборд ──────────────────────────────────────────────
async function switchLeaderboard(type) {
    activeLeaderboard = type;

    document.querySelectorAll(".leaderboard-tab").forEach(tab => {
        tab.classList.remove("active");
    });

    event.target.classList.add("active");

    await loadLeaderboard();
}

async function loadLeaderboard() {
    const endpoint = activeLeaderboard === 'balance' ? 'leaderboard/balance' : 'leaderboard/bestwin';

    try {
        const response = await fetch(WORKER_URL + endpoint, {
            method: "GET",
            credentials: "include"
        });

        if (response.ok) {
            const leaders = await response.json();
            console.log("Лидеры:", leaders);
            renderLeaderboard(leaders);
        }
    } catch (err) {
        console.error("Ошибка загрузки лидерборда:", err);
    }
}

function renderLeaderboard(leaders) {
    const list = document.getElementById("leaderboardList");
    if (!list) return;

    list.innerHTML = "";

    leaders.forEach((leader, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';

        const avatar = leader.avatar ? leader.avatar :
            `data:image/svg+xml,${encodeURIComponent(`
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="20" fill="#4a5568"/>
                    <circle cx="20" cy="15" r="6" fill="#718096"/>
                    <path d="M10 32C10 27 14 24 20 24C26 24 30 27 30 32" fill="#718096"/>
                </svg>
            `)}`;

        const itemEl = document.createElement("div");
        itemEl.className = "leaderboard-item";
        itemEl.innerHTML = `
            <div class="leaderboard-rank ${rankClass}">${rank}</div>
            <img src="${avatar}" class="leaderboard-avatar" alt="Avatar">
            <div class="leaderboard-info">
                <div class="leaderboard-name">${escapeHtml(leader.name)}</div>
            </div>
            <div class="leaderboard-value">${leader.value} 🪙</div>
        `;
        list.appendChild(itemEl);
    });
}
document.addEventListener("DOMContentLoaded", () => {
    drawWheel();
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
window.openProfileSettings = openProfileSettings;
window.closeProfileSettings = closeProfileSettings;
window.changeDisplayName = changeDisplayName;
window.changePassword = changePassword;
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
window.connectNotesSocket = connectNotesSocket;
window.disconnectNotesSocket = disconnectNotesSocket;
window.switchLeaderboard = switchLeaderboard;
window.selectUpgraderSlot = selectUpgraderSlot;
window.performUpgrade = performUpgrade;
