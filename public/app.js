// ===== Подключение к Socket.IO серверу =====
const socket = io();

// DOM-элементы
const chatDiv = document.getElementById("chat");
const usersDiv = document.getElementById("users");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const privateTo = document.getElementById("privateTo");
const privateMsg = document.getElementById("privateMsg");
const sendPrivateBtn = document.getElementById("sendPrivate");

// ===== Регистрация пользователя =====
// Запрашиваем имя при входе и отправляем на сервер
let myName = prompt("Введите ваше имя:");
while (!myName || myName.trim() === "") {
    myName = prompt("Имя не может быть пустым. Введите ваше имя:");
}
myName = myName.trim();

socket.on("connect", () => {
    socket.emit("register", myName);
});

// ===== Обновление списка пользователей =====
socket.on("userList", (users) => {
    usersDiv.innerHTML = users
        .map((u) => `<div class="user-item">🟢 ${u}</div>`)
        .join("");
});

// ===== Получение сообщений (групповых и личных) =====
socket.on("chatMessage", (data) => {
    const div = document.createElement("div");
    div.className = "msg" + (data.type === "private" ? " private" : "");

    if (data.type === "private") {
        // Если это сообщение от другого человека — показываем "мне"
        const toLabel = data.to === myName ? "мне" : data.to;
        div.innerHTML = `<span class="author">[Личное] ${data.from} → ${toLabel}:</span> ${data.text}`;
    } else {
        div.innerHTML = `<span class="author">${data.from}:</span> ${data.text}`;
    }

    chatDiv.appendChild(div);
    // Автоскролл вниз
    chatDiv.scrollTop = chatDiv.scrollHeight;
});

// ===== Обработка ошибок от сервера =====
socket.on("errorMsg", (msg) => {
    alert(msg);
});

// ===== Отправка группового сообщения (K1) =====
sendBtn.addEventListener("click", () => {
    const text = msgInput.value.trim();
    if (text) {
        socket.emit("groupMessage", text);
        msgInput.value = "";
    }
});

// Отправка по Enter
msgInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendBtn.click();
});

// ===== Отправка личного сообщения (K2) =====
sendPrivateBtn.addEventListener("click", () => {
    const to = privateTo.value.trim();
    const text = privateMsg.value.trim();
    if (to && text) {
        socket.emit("privateMessage", { to, text });
        privateMsg.value = "";
    }
});

privateMsg.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendPrivateBtn.click();
});