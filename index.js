const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// Настройка клиентов Redis
const pubClient = createClient({ url: "redis://localhost:6379" });
const subClient = pubClient.duplicate();
const dbClient = createClient({ url: "redis://localhost:6379" }); 

Promise.all([pubClient.connect(), subClient.connect(), dbClient.connect()])
    .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log("✅ Адаптер Redis подключён");
    });

// Просто получаем список пользователей из Redis
async function getOnlineUsers() {
    const users = await dbClient.hGetAll("online_users");
    return Object.values(users);
}

io.on("connection", (socket) => {
    console.log("🔌 Подключение:", socket.id);

    socket.on("register", async (username) => {
        if (!username || username.trim() === "") return;

        // Проверяем, нет ли уже такого имени в Redis
        const users = await getOnlineUsers();
        if (users.includes(username)) {
            socket.emit("errorMsg", "Это имя уже занято");
            return;
        }

        // Сохраняем в Redis: socket.id -> username
        await dbClient.hSet("online_users", socket.id, username);
        socket.username = username;

        // Рассылаем всем обновленный список
        io.emit("userList", await getOnlineUsers());
        console.log(`👤 ${username} вошёл. Онлайн: ${users.length + 1}`);
    });

    // --- Групповое сообщение (K1) ---
    socket.on("groupMessage", (msg) => {
        if (!msg || !msg.trim()) return;
        io.emit("chatMessage", {
            from: socket.username || "Аноним",
            text: msg,
            type: "group",
        });
    });

    // --- Личное сообщение (K2) ---
    socket.on("privateMessage", async ({ to, text }) => {
        if (!to || !text || !text.trim()) return;

        // Ищем socket.id получателя в Redis
        const allUsers = await dbClient.hGetAll("online_users");
        let targetSocketId = null;
        
        for (const [id, name] of Object.entries(allUsers)) {
            if (name === to) {
                targetSocketId = id;
                break;
            }
        }

        if (targetSocketId) {
            io.to(targetSocketId).emit("chatMessage", {
                from: socket.username, to: to, text: text, type: "private",
            });
            socket.emit("chatMessage", {
                from: socket.username, to: to, text: text, type: "private",
            });
        } else {
            socket.emit("errorMsg", `Пользователь "${to}" не в сети`);
        }
    });

    // --- Отключение ---
    socket.on("disconnect", async () => {
        if (socket.username) {
            // Удаляем только того, кто отключился
            await dbClient.hDel("online_users", socket.id);
            io.emit("userList", await getOnlineUsers());
            console.log(`👋 ${socket.username} вышел`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});