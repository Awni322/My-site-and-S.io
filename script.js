/* ============================================================
   АРХИВ — слой взаимодействий
   Работает поверх script.js и ничего в нём не меняет.
   Всё отключается при prefers-reduced-motion и на тач-экранах.
   ============================================================ */

(() => {
    "use strict";

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- Общая позиция указателя (фон, параллакс) ---------- */

    const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
    const root = document.documentElement;
    let bgFrame = null;

    function onMove(e) {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        if (bgFrame) return;
        bgFrame = requestAnimationFrame(() => {
            bgFrame = null;
            root.style.setProperty("--px", (pointer.x / innerWidth).toFixed(3));
            root.style.setProperty("--py", (pointer.y / innerHeight).toFixed(3));
            root.style.setProperty("--pxp", (pointer.x / innerWidth * 100).toFixed(1) + "%");
            root.style.setProperty("--pyp", (pointer.y / innerHeight * 100).toFixed(1) + "%");
        });
    }
    window.addEventListener("pointermove", onMove, { passive: true });

    /* ---------- Локальные координаты для подсветки элементов ---------- */

    const LIT = ".note-card, .game-card, .btn-save, .btn-cancel, .filter-btn," +
                ".btn-modal-copy, .btn-delete-confirm, .roblox-link-btn," +
                ".file-upload-button, #login button";

    let litFrame = null;
    document.addEventListener("pointermove", (e) => {
        const el = e.target.closest && e.target.closest(LIT);
        if (!el || litFrame) return;
        litFrame = requestAnimationFrame(() => {
            litFrame = null;
            const r = el.getBoundingClientRect();
            el.style.setProperty("--mx", ((pointer.x - r.left) / r.width * 100).toFixed(1) + "%");
            el.style.setProperty("--my", ((pointer.y - r.top) / r.height * 100).toFixed(1) + "%");
        });
    }, { passive: true });

    /* ---------- Наклон карточек ---------- */

    if (finePointer && !reduced) {
        const MAX = 3.2;
        let tiltFrame = null;

        document.addEventListener("pointermove", (e) => {
            const card = e.target.closest && e.target.closest(".note-card");
            if (!card || tiltFrame) return;
            tiltFrame = requestAnimationFrame(() => {
                tiltFrame = null;
                const r = card.getBoundingClientRect();
                const dx = (pointer.x - r.left) / r.width - .5;
                const dy = (pointer.y - r.top) / r.height - .5;
                card.style.setProperty("--ry", (dx * MAX * 2).toFixed(2) + "deg");
                card.style.setProperty("--rx", (-dy * MAX * 2).toFixed(2) + "deg");
            });
        }, { passive: true });

        document.addEventListener("pointerout", (e) => {
            const card = e.target.closest && e.target.closest(".note-card");
            if (card && !card.contains(e.relatedTarget)) {
                card.style.setProperty("--rx", "0deg");
                card.style.setProperty("--ry", "0deg");
            }
        }, { passive: true });
    }

    /* ---------- Магнитные элементы ---------- */

    const MAGNETIC = ".btn-save, .settings-toggle-btn, .side-arrow, .modal-close," +
                     ".btn-delete-confirm";

    if (finePointer && !reduced) {
        let current = null;

        document.addEventListener("pointermove", (e) => {
            const el = e.target.closest && e.target.closest(MAGNETIC);
            if (current && current !== el) {
                current.style.translate = "";
                current = null;
            }
            if (!el) return;
            current = el;
            const r = el.getBoundingClientRect();
            const dx = pointer.x - (r.left + r.width / 2);
            const dy = pointer.y - (r.top + r.height / 2);
            const pull = el.classList.contains("side-arrow") ? .18 : .28;
            el.style.translate = `${(dx * pull).toFixed(1)}px ${(dy * pull).toFixed(1)}px`;
        }, { passive: true });

        document.addEventListener("pointerleave", () => {
            if (current) { current.style.translate = ""; current = null; }
        }, true);
    }

    /* ---------- Курсор-визир ---------- */

    if (finePointer && !reduced) {
        const ring = document.createElement("div");
        ring.className = "cursor-ring cursor-hidden";
        ring.innerHTML = "<i></i><i></i><i></i><i></i>";
        const dot = document.createElement("div");
        dot.className = "cursor-dot cursor-hidden";
        document.body.append(ring, dot);
        root.classList.add("cursor-ready");

        const SNAP = "button, a, .radio-label, .toggle-container, .file-upload-button," +
                     ".ttt-cell, .leaderboard-row, .settings-option, .theme-preview";
        const TEXT = "input:not([type=file]):not([type=checkbox]):not([type=radio]), textarea";

        const state = { x: pointer.x, y: pointer.y, w: 34, h: 34, r: 11 };
        const target = { ...state };
        let locked = null;
        let lockedRadius = 12;

        function lockOn(el) {
            locked = el || null;
            if (locked) {
                const raw = parseFloat(getComputedStyle(locked).borderRadius);
                lockedRadius = Math.min((isNaN(raw) ? 6 : raw) + 6, 26);
            }
        }

        function measure() {
            if (locked && document.contains(locked)) {
                const b = locked.getBoundingClientRect();
                target.x = b.left + b.width / 2;
                target.y = b.top + b.height / 2;
                target.w = Math.min(b.width + 12, 320);
                target.h = b.height + 12;
                target.r = lockedRadius;
            } else {
                target.x = pointer.x;
                target.y = pointer.y;
                target.w = ring.classList.contains("is-text") ? 3 : 34;
                target.h = ring.classList.contains("is-text") ? 26 : 34;
                target.r = 11;
            }
        }

        function loop() {
            measure();
            const k = locked ? .22 : .16;
            state.x += (target.x - state.x) * (locked ? .3 : .22);
            state.y += (target.y - state.y) * (locked ? .3 : .22);
            state.w += (target.w - state.w) * k;
            state.h += (target.h - state.h) * k;
            state.r += (target.r - state.r) * k;

            ring.style.width = state.w.toFixed(1) + "px";
            ring.style.height = state.h.toFixed(1) + "px";
            ring.style.margin = `${(-state.h / 2).toFixed(1)}px 0 0 ${(-state.w / 2).toFixed(1)}px`;
            ring.style.borderRadius = state.r.toFixed(1) + "px";
            ring.style.transform = `translate(${state.x.toFixed(1)}px, ${state.y.toFixed(1)}px)`;
            dot.style.transform = `translate(${pointer.x}px, ${pointer.y}px)`;
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);

        document.addEventListener("pointerover", (e) => {
            const t = e.target;
            if (!t.closest) return;
            ring.classList.remove("cursor-hidden");
            dot.classList.remove("cursor-hidden");

            const text = t.closest(TEXT);
            ring.classList.toggle("is-text", !!text);
            dot.classList.toggle("is-text", !!text);

            const snap = text ? null : t.closest(SNAP);
            lockOn(snap);
            ring.classList.toggle("is-locked", !!snap);
        }, { passive: true });

        document.addEventListener("pointerdown", () => dot.classList.add("is-down"), { passive: true });
        document.addEventListener("pointerup", () => dot.classList.remove("is-down"), { passive: true });

        document.addEventListener("pointerleave", () => {
            ring.classList.add("cursor-hidden");
            dot.classList.add("cursor-hidden");
        });
        document.addEventListener("pointerenter", () => {
            ring.classList.remove("cursor-hidden");
            dot.classList.remove("cursor-hidden");
        });

        /* Импульс по клику */
        document.addEventListener("pointerdown", (e) => {
            const ping = document.createElement("span");
            ping.className = "click-ping";
            ping.style.left = e.clientX + "px";
            ping.style.top = e.clientY + "px";
            document.body.appendChild(ping);
            setTimeout(() => ping.remove(), 600);
        }, { passive: true });
    }

    /* ---------- Шапка: логотип, линия, счётчик ---------- */

    function buildHeader() {
        const h1 = document.querySelector("#content > h1");
        if (!h1 || h1.dataset.built) return;
        h1.dataset.built = "1";

        const text = h1.textContent.trim();
        h1.textContent = "";

        const word = document.createElement("span");
        word.className = "wordmark";
        [...text].forEach((ch, i) => {
            const s = document.createElement("span");
            s.className = "wm-letter";
            s.style.setProperty("--l", i);
            s.textContent = ch;
            word.appendChild(s);
        });

        const rule = document.createElement("span");
        rule.className = "head-rule";

        const count = document.createElement("span");
        count.className = "record-count";
        count.id = "recordCount";
        count.innerHTML = "записей <b>0</b>";

        h1.append(word, rule, count);
        if (!reduced) h1.classList.add("wm-animate");
    }

    function updateCount() {
        const count = document.getElementById("recordCount");
        const notes = document.getElementById("notes");
        if (!count || !notes) return;
        const n = notes.querySelectorAll(".note-card").length;
        count.innerHTML = `записей <b>${n}</b>`;
    }

    /* ---------- Поиск: обёртка и подсказка ---------- */

    function wrapSearch() {
        const search = document.getElementById("search");
        if (!search || search.parentElement.classList.contains("search-wrap")) return;
        const wrap = document.createElement("div");
        wrap.className = "search-wrap";
        search.parentNode.insertBefore(wrap, search);
        wrap.appendChild(search);
        const hint = document.createElement("span");
        hint.className = "search-hint";
        hint.textContent = "/";
        wrap.appendChild(hint);
    }

    /* ---------- Порядок появления карточек ---------- */

    function indexCards() {
        const notes = document.getElementById("notes");
        if (!notes) return;
        [...notes.children].forEach((el, i) => el.style.setProperty("--i", Math.min(i, 14)));
        updateCount();
    }

    /* ---------- Клавиатура ---------- */

    document.addEventListener("keydown", (e) => {
        const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);

        if (e.key === "/" && !typing) {
            const search = document.getElementById("search");
            if (search) { e.preventDefault(); search.focus(); }
        }

        if (e.key === "Escape") {
            const open = document.querySelector(".modal-overlay.active");
            const games = document.getElementById("gamesPanel");
            if (open && open.id === "modalOverlay") window.closeModal?.();
            else if (open && open.id === "confirmOverlay") window.closeConfirmModal?.();
            else if (open && open.id === "profileOverlay" &&
                     document.getElementById("profileCancelBtn")?.style.display !== "none") {
                window.closeProfileModal?.();
            } else if (games && games.classList.contains("active")) {
                window.closeGamesPanel?.();
            }
        }
    });

    /* ---------- Запуск ---------- */

    function init() {
        buildHeader();
        wrapSearch();
        indexCards();

        const notes = document.getElementById("notes");
        if (notes) new MutationObserver(indexCards).observe(notes, { childList: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
