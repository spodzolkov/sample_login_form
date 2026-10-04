// server.js - Universal Node.js Express Backend with WebAssembly SQLite (sql.js)

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

// === ДРАЙВЕР БАЗИ ДАНИХ (SQL.JS WEBASSEMBLY / JSON FALLBACK) ===
let dbMode = 'sql.js';
let sqlDb = null;
const jsonDbPath = path.join(__dirname, 'database.json');
const sqliteDbPath = path.join(__dirname, 'database.sqlite');

const saveSqliteFile = () => {
    if (sqlDb) {
        try {
            const data = sqlDb.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(sqliteDbPath, buffer);
        } catch (e) {
            console.error('[БД] Помилка збереження SQLite файлу:', e.message);
        }
    }
};

let dbInitPromise = null;

const initDatabase = async () => {
    if (dbInitPromise) return dbInitPromise;

    dbInitPromise = (async () => {
        try {
            const initSqlJs = require('sql.js');
            const SQL = await initSqlJs();

            if (fs.existsSync(sqliteDbPath)) {
                const filebuffer = fs.readFileSync(sqliteDbPath);
                sqlDb = new SQL.Database(filebuffer);
            } else {
                sqlDb = new SQL.Database();
            }

            sqlDb.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            sqlDb.run(`
                CREATE TABLE IF NOT EXISTS scores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nickname TEXT NOT NULL,
                    score INTEGER NOT NULL,
                    wave INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            saveSqliteFile();
            dbMode = 'sql.js';
            console.log('[БД] Успішно підключено та ініціалізовано sql.js (WebAssembly SQLite Engine).');
        } catch (e) {
            console.warn('[БД] Помилка ініціалізації sql.js, перехід на JSON Database Engine:', e.message);
            dbMode = 'json';
        }
    })();

    return dbInitPromise;
};

// Запускаємо ініціалізацію бази при старті
initDatabase();

const scoresJsonPath = path.join(__dirname, 'scores.json');
if (!fs.existsSync(scoresJsonPath)) {
    fs.writeFileSync(scoresJsonPath, JSON.stringify([], null, 2));
}

// Ініціалізація JSON БД при відсутності файлу
if (!fs.existsSync(jsonDbPath)) {
    fs.writeFileSync(jsonDbPath, JSON.stringify([], null, 2));
}

// Допоміжні функції роботи з JSON БД
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

const readJsonScores = () => {
    try {
        const data = fs.readFileSync(scoresJsonPath, 'utf8');
        return JSON.parse(data || '[]');
    } catch {
        return [];
    }
};

const writeJsonScores = (scores) => {
    fs.writeFileSync(scoresJsonPath, JSON.stringify(scores, null, 2));
};

// Операція отримання Топ-10 рекордів (BUG-POLY1-07: ORDER BY score ASC)
const dbGetTopScores = async () => {
    await initDatabase();

    if (dbMode === 'sql.js' && sqlDb) {
        const stmt = sqlDb.prepare('SELECT id, nickname, score, wave, created_at FROM scores ORDER BY score ASC, created_at ASC LIMIT 10');
        const rows = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
    } else {
        const scores = readJsonScores();
        return scores
            .sort((a, b) => a.score - b.score || new Date(a.created_at) - new Date(b.created_at))
            .slice(0, 10);
    }
};

// Операція додавання рекорду
const dbAddScore = async (nickname, score, wave = 1) => {
    await initDatabase();

    const now = new Date().toISOString();

    if (dbMode === 'sql.js' && sqlDb) {
        const stmt = sqlDb.prepare('INSERT INTO scores (nickname, score, wave, created_at) VALUES (?, ?, ?, ?)');
        stmt.run([nickname, score, wave, now]);
        stmt.free();
        saveSqliteFile();

        const getStmt = sqlDb.prepare('SELECT last_insert_rowid() as id');
        let recordId = Date.now();
        if (getStmt.step()) {
            recordId = getStmt.getAsObject().id;
        }
        getStmt.free();

        return { id: recordId, nickname, score, wave, created_at: now };
    } else {
        const scores = readJsonScores();
        const newRecord = {
            id: scores.length + 1,
            nickname,
            score: Number(score),
            wave: Number(wave) || 1,
            created_at: now
        };
        scores.push(newRecord);
        writeJsonScores(scores);
        return newRecord;
    }
};

// Операція додавання користувача
const dbAddUser = async (email, password) => {
    await initDatabase();

    if (dbMode === 'sql.js' && sqlDb) {
        try {
            // Перевірка UNIQUE
            const checkStmt = sqlDb.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)');
            checkStmt.bind([email]);
            const exists = checkStmt.step();
            checkStmt.free();

            if (exists) {
                throw { code: 'DUPLICATE', message: 'Користувач з таким Email вже існує.' };
            }

            const now = new Date().toISOString();
            const insertStmt = sqlDb.prepare('INSERT INTO users (email, password, created_at) VALUES (?, ?, ?)');
            insertStmt.run([email, password, now]);
            insertStmt.free();

            saveSqliteFile();

            const getStmt = sqlDb.prepare('SELECT id, email, created_at FROM users WHERE email = ?');
            getStmt.bind([email]);
            let newUser = { id: 1, email, created_at: now };
            if (getStmt.step()) {
                newUser = getStmt.getAsObject();
            }
            getStmt.free();

            return newUser;
        } catch (err) {
            if (err.code === 'DUPLICATE') throw err;
            if (err.message && err.message.includes('UNIQUE constraint failed')) {
                throw { code: 'DUPLICATE', message: 'Користувач з таким Email вже існує.' };
            }
            throw { code: 'ERROR', message: err.message };
        }
    } else {
        // JSON DB Mode
        const users = readJsonUsers();
        const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
        if (exists) {
            throw { code: 'DUPLICATE', message: 'Користувач з таким Email вже існує в базі даних.' };
        }
        const newUser = {
            id: users.length + 1,
            email,
            password,
            created_at: new Date().toISOString()
        };
        users.push(newUser);
        writeJsonUsers(users);
        return newUser;
    }
};

// Операція пошуку користувача для входу
const dbFindUser = async (email, password) => {
    await initDatabase();

    if (dbMode === 'sql.js' && sqlDb) {
        const stmt = sqlDb.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND password = ?');
        stmt.bind([email, password]);
        let user = null;
        if (stmt.step()) {
            user = stmt.getAsObject();
        }
        stmt.free();
        return user;
    } else {
        // JSON DB Mode
        const users = readJsonUsers();
        return users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password) || null;
    }
};

// Операція отримання списку користувачів (для QA)
const dbGetAllUsers = async () => {
    await initDatabase();

    if (dbMode === 'sql.js' && sqlDb) {
        const stmt = sqlDb.prepare('SELECT id, email, created_at FROM users');
        const rows = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
    } else {
        const users = readJsonUsers();
        return users.map(({ id, email, created_at }) => ({ id, email, created_at }));
    }
};

// === REST API ENDPOINTS ===

// 1. Healthcheck
app.get('/api/health', async (req, res) => {
    await initDatabase();
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

// 5. Отримання Топ-10 Рекордів (GET /api/scores)
app.get('/api/scores', async (req, res) => {
    try {
        const scores = await dbGetTopScores();
        res.json({ success: true, count: scores.length, scores });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 6. Додавання Нового Рекорду (POST /api/scores)
app.post('/api/scores', async (req, res) => {
    const { nickname, score, wave } = req.body;

    if (!nickname || score === undefined || score === null) {
        return res.status(400).json({ success: false, message: 'Нікнейм та кількість очок є обов’язковими.' });
    }

    const nick = String(nickname).trim();
    const numericScore = Number(score);
    const numericWave = Number(wave) || 1;

    if (nick.length < 2 || nick.length > 15) {
        return res.status(400).json({ success: false, message: 'Нікнейм повинен містити від 2 до 15 символів.' });
    }

    if (isNaN(numericScore) || numericScore <= 0) {
        return res.status(400).json({ success: false, message: 'Кількість очок повинна бути додатним числом.' });
    }

    try {
        const record = await dbAddScore(nick, numericScore, numericWave);
        console.log(`[БД] Збережено новий рекорд (${dbMode}):`, nick, numericScore);
        res.status(201).json({
            success: true,
            message: 'Рекорд успішно збережено в базу даних!',
            recordId: record.id
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Помилка сервера при збереженні рекорду.' });
    }
});

// SPA Фолбек
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера (тільки при прямому запуску, не під час тестів)
if (require.main === module) {
    app.listen(PORT, async () => {
        await initDatabase();
        console.log(`===================================================`);
        console.log(` Сервер запущен успішно на порту ${PORT}!`);
        console.log(` Базовий двигун БД: ${dbMode.toUpperCase()} (WebAssembly)`);
        console.log(`===================================================`);
    });
}

module.exports = app;
