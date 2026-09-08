// server.js - Universal Node.js Express Backend with Fail-Safe Cross-Platform Database

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// === ДРАЙВЕР БАЗИ ДАНИХ (УНІВЕРСАЛЬНИЙ КРОС-ПЛАТФОРМЕНИЙ) ===
let dbMode = 'sqlite';
let sqliteDb = null;
const jsonDbPath = path.join(__dirname, 'database.json');
const sqliteDbPath = path.join(__dirname, 'database.sqlite');

// Спроба підключити SQLite з автоматичним фолбеком на JSON File DB для Render/Linux
try {
    const sqlite3 = require('sqlite3').verbose();
    sqliteDb = new sqlite3.Database(sqliteDbPath, (err) => {
        if (err) {
            console.warn('[БД] SQLite недоступна, перехід на JSON Database Engine:', err.message);
            dbMode = 'json';
        } else {
            console.log('[БД] Успішно підключено SQLite базу даних.');
            sqliteDb.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }
    });
} catch (e) {
    console.warn('[БД] Нативні бінарники SQLite3 не завантажилися (ERR_DLOPEN_FAILED на Render/Linux).');
    console.log('[БД] Автоматичний перехід на вбудований безпомилковий JSON Database Engine!');
    dbMode = 'json';
}

// Ініціалізація JSON БД при відсутності файлу
if (!fs.existsSync(jsonDbPath)) {
    fs.writeFileSync(jsonDbPath, JSON.stringify([], null, 2));
}

// Допоміжні функції роботи з базою даних
const readJsonUsers = () => {
    try {
        const data = fs.readFileSync(jsonDbPath, 'utf8');
        return JSON.parse(data || '[]');
    } catch {
        return [];
    }
};

const writeJsonUsers = (users) => {
    fs.writeFileSync(jsonDbPath, JSON.stringify(users, null, 2));
};

// Операція додавання користувача
const dbAddUser = (email, password) => {
    return new Promise((resolve, reject) => {
        if (dbMode === 'sqlite' && sqliteDb) {
            const sql = 'INSERT INTO users (email, password) VALUES (?, ?)';
            sqliteDb.run(sql, [email, password], function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return reject({ code: 'DUPLICATE', message: 'Користувач з таким Email вже існує.' });
                    }
                    return reject({ code: 'ERROR', message: err.message });
                }
                resolve({ id: this.lastID, email, created_at: new Date().toISOString() });
            });
        } else {
            // JSON DB Mode
            const users = readJsonUsers();
            const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
            if (exists) {
                return reject({ code: 'DUPLICATE', message: 'Користувач з таким Email вже існує в базі даних.' });
            }
            const newUser = {
                id: users.length + 1,
                email,
                password,
                created_at: new Date().toISOString()
            };
            users.push(newUser);
            writeJsonUsers(users);
            resolve(newUser);
        }
    });
};

// Операція пошуку користувача для входу
const dbFindUser = (email, password) => {
    return new Promise((resolve, reject) => {
        if (dbMode === 'sqlite' && sqliteDb) {
            const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
            sqliteDb.get(sql, [email, password], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        } else {
            // JSON DB Mode
            const users = readJsonUsers();
            const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
            resolve(user || null);
        }
    });
};

// Операція отримання списку користувачів (для QA)
const dbGetAllUsers = () => {
    return new Promise((resolve, reject) => {
        if (dbMode === 'sqlite' && sqliteDb) {
            sqliteDb.all('SELECT id, email, created_at FROM users', [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        } else {
            const users = readJsonUsers();
            const safeUsers = users.map(({ id, email, created_at }) => ({ id, email, created_at }));
            resolve(safeUsers);
        }
    });
};

// === REST API ENDPOINTS ===

// 1. Healthcheck
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', dbMode, timestamp: new Date().toISOString() });
});

// 2. Реєстрація (POST /api/signup)
app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email та Password є обов’язковими.' });
    }

    const emailVal = email.trim();
    const passwordVal = password.trim();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (emailVal.length > 30 || !emailRegex.test(emailVal)) {
        return res.status(400).json({ success: false, message: 'Некоректний Email (наприклад, a@b.c, до 30 символів).' });
    }

    const passwordRegex = /^[a-zA-Z0-9_!@#$%^&*()]+$/;
    if (passwordVal.length > 30 || !passwordRegex.test(passwordVal)) {
        return res.status(400).json({ success: false, message: 'Некоректний пароль (до 30 символів, дозволено: a-z, A-Z, 0-9, _!@#$%^&*()).' });
    }

    try {
        const user = await dbAddUser(emailVal, passwordVal);
        console.log(`[БД] Зареєстровано користувача (${dbMode}):`, emailVal);
        res.status(201).json({
            success: true,
            message: 'Реєстрація успішна! Користувача збережено в базу даних.',
            userId: user.id
        });
    } catch (err) {
        if (err.code === 'DUPLICATE') {
            return res.status(409).json({ success: false, message: err.message });
        }
        res.status(500).json({ success: false, message: 'Помилка сервера при збереженні.' });
    }
});

// 3. Авторизація (POST /api/login)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email та Password є обов’язковими.' });
    }

    const emailVal = email.trim();
    const passwordVal = password.trim();

    try {
        const user = await dbFindUser(emailVal, passwordVal);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Невірний Email або Password.' });
        }

        console.log(`[БД] Успішний вхід (${dbMode}):`, emailVal);
        res.json({
            success: true,
            message: 'Вхід успішний!',
            user: { id: user.id, email: user.email, created_at: user.created_at }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Помилка сервера при перевірці даних.' });
    }
});

// 4. QA Список користувачів (GET /api/users)
app.get('/api/users', async (req, res) => {
    try {
        const users = await dbGetAllUsers();
        res.json({ success: true, count: users.length, dbEngine: dbMode, users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// SPA Фолбек
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` Сервер запущен успішно на порту ${PORT}!`);
    console.log(` Базовий двигун БД: ${dbMode.toUpperCase()}`);
    console.log(`===================================================`);
});
