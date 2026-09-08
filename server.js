// server.js - Node.js Express Backend with SQLite Database

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Инициализация базы данных SQLite
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка подключения к базe данных SQLite:', err.message);
    } else {
        console.log('Подключено к базе данных SQLite:', dbPath);
    }
});

// Создание таблицы пользователей, если она не существует
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error('Ошибка создания таблицы users:', err.message);
    } else {
        console.log('Таблица users готова.');
    }
});

// === REST API ENDPOINTS ===

// 1. Healthcheck
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. Регистрация нового пользователя (POST /api/signup)
app.post('/api/signup', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email та Password є обов’язковими.' });
    }

    const emailVal = email.trim();
    const passwordVal = password.trim();

    // Валидация Email (a@b.c, макс 30)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (emailVal.length > 30 || !emailRegex.test(emailVal)) {
        return res.status(400).json({ success: false, message: 'Некоректний Email (наприклад, a@b.c, до 30 символів).' });
    }

    // Валидация Password (макс 30, спецсимволы)
    const passwordRegex = /^[a-zA-Z0-9_!@#$%^&*()]+$/;
    if (passwordVal.length > 30 || !passwordRegex.test(passwordVal)) {
        return res.status(400).json({ success: false, message: 'Некоректний пароль (до 30 символів, дозволено: a-z, A-Z, 0-9, _!@#$%^&*()).' });
    }

    // Вставка в базу данных
    const sql = 'INSERT INTO users (email, password) VALUES (?, ?)';
    db.run(sql, [emailVal, passwordVal], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ success: false, message: 'Користувач з таким Email вже існує в базі даних.' });
            }
            console.error('Ошибка записи в БД:', err.message);
            return res.status(500).json({ success: false, message: 'Помилка сервера при збереженні в базу даних.' });
        }

        console.log(`[БД] Зареєстровано нового користувача: ID ${this.lastID}, Email: ${emailVal}`);
        res.status(201).json({
            success: true,
            message: 'Реєстрація успішна! Користувача збережено в базу даних.',
            userId: this.lastID
        });
    });
});

// 3. Авторизация пользователя (POST /api/login)
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email та Password є обов’язковими.' });
    }

    const emailVal = email.trim();
    const passwordVal = password.trim();

    const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
    db.get(sql, [emailVal, passwordVal], (err, user) => {
        if (err) {
            console.error('Ошибка чтения из БД:', err.message);
            return res.status(500).json({ success: false, message: 'Помилка сервера при перевірці даних.' });
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'Невірний Email або Password.' });
        }

        console.log(`[БД] Успішний вхід користувача: Email ${emailVal}`);
        res.json({
            success: true,
            message: 'Вхід успішний!',
            user: { id: user.id, email: user.email, created_at: user.created_at }
        });
    });
});

// 4. Список пользователей для QA тестов (GET /api/users)
app.get('/api/users', (req, res) => {
    db.all('SELECT id, email, created_at FROM users', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, count: rows.length, users: rows });
    });
});

// Главный роут для SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` Сервер та База Даних запущені успішно!`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` QA API Список користувачів: http://localhost:${PORT}/api/users`);
    console.log(`===================================================`);
});
