// Подключаем библиотеку Redis
const redis = require("redis");

// Создаём клиент. По умолчанию подключается к localhost:6379
const client = redis.createClient();

// Обработчик успешного подключения
client.on("connect", () => {
    console.log("Подключено к Redis (хранилище данных)");
});

// Обработчик ошибок подключения
client.on("error", (err) => {
    console.error("Ошибка подключения к Redis:", err);
});

// Запускаем подключение (в новых версиях redis это обязательно)
client.connect();

// Экспортируем клиент для использования в других файлах
module.exports = client;