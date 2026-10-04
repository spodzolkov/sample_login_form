const request = require('supertest');
const app = require('../server');

describe('Login Form API Unit & Integration Tests', () => {
    const timestamp = Date.now();
    const testUser = {
        email: `test_${timestamp}@example.com`,
        password: 'ValidPassword123!'
    };

    // 1. Healthcheck Endpoint
    describe('GET /api/health', () => {
        it('повинен повертати 200 OK і статус сервера', async () => {
            const res = await request(app)
                .get('/api/health')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('status', 'ok');
            expect(res.body).toHaveProperty('dbMode');
            expect(res.body).toHaveProperty('timestamp');
        });
    });

    // 2. Signup Endpoint
    describe('POST /api/signup', () => {
        it('повинен успішно реєструвати нового користувача з валідними даними', async () => {
            const res = await request(app)
                .post('/api/signup')
                .send(testUser)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('userId');
            expect(res.body.message).toMatch(/Успішна|збережено/i);
        });

        it('повинен повертати 400 при відсутності обов’язкових полів', async () => {
            const res = await request(app)
                .post('/api/signup')
                .send({ email: 'only_email@test.com' })
                .expect(400);

            expect(res.body).toHaveProperty('success', false);
            expect(res.body.message).toMatch(/обов’язковими/i);
        });

        it('повинен повертати 400 при невалідному форматі Email', async () => {
            const res = await request(app)
                .post('/api/signup')
                .send({ email: 'not-an-email', password: 'Password123' })
                .expect(400);

            expect(res.body).toHaveProperty('success', false);
            expect(res.body.message).toMatch(/Некоректний Email/i);
        });

        it('повинен повертати 400 якщо довжина Email більше 30 символів', async () => {
            const res = await request(app)
                .post('/api/signup')
                .send({ email: 'verylongemailaddress1234567890@test.com', password: 'Password123' })
                .expect(400);

            expect(res.body).toHaveProperty('success', false);
            expect(res.body.message).toMatch(/Некоректний Email/i);
        });

        it('повинен повертати 400 якщо пароль містить недопустимі символи або закороткий/задовгий', async () => {
            const res = await request(app)
                .post('/api/signup')
                .send({ email: `valid_${timestamp}@test.com`, password: 'password with spaces' })
                .expect(400);

            expect(res.body).toHaveProperty('success', false);
            expect(res.body.message).toMatch(/Некоректний пароль/i);
        });

        it('повинен повертати 409 Conflict при спробі повторної реєстрації з тим самим Email', async () => {
            const res = await request(app)
                .post('/api/signup')
                .send(testUser)
                .expect(409);

            expect(res.body).toHaveProperty('success', false);
            expect(res.body.message).toMatch(/вже існує/i);
        });
    });

    // 3. Login Endpoint
    describe('POST /api/login', () => {
        it('повинен успішно авторизувати зареєстрованого користувача', async () => {
            const res = await request(app)
                .post('/api/login')
                .send(testUser)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('user');
            expect(res.body.user.email.toLowerCase()).toBe(testUser.email.toLowerCase());
        });

        it('повинен повертати 401 Unauthorized при введеному невірному паролі', async () => {
            const res = await request(app)
                .post('/api/login')
                .send({ email: testUser.email, password: 'WrongPassword123' })
                .expect(401);

            expect(res.body).toHaveProperty('success', false);
            expect(res.body.message).toMatch(/Невірний Email або Password/i);
        });

        it('повинен повертати 401 Unauthorized для неіснуючого користувача', async () => {
            const res = await request(app)
                .post('/api/login')
                .send({ email: 'nonexistent_user_999@test.com', password: 'Password123' })
                .expect(401);

            expect(res.body).toHaveProperty('success', false);
        });

        it('повинен повертати 400 Bad Request при відсутності полів', async () => {
            const res = await request(app)
                .post('/api/login')
                .send({ email: testUser.email })
                .expect(400);

            expect(res.body).toHaveProperty('success', false);
        });
    });

    // 4. Get All Users Endpoint (QA Endpoint)
    describe('GET /api/users', () => {
        it('повинен повертати список користувачів та їх кількість', async () => {
            const res = await request(app)
                .get('/api/users')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('count');
            expect(Array.isArray(res.body.users)).toBe(true);
            expect(res.body.count).toBeGreaterThanOrEqual(1);
        });
    });

    // 5. Scores Endpoints (Leaderboard)
    describe('Scores API (/api/scores)', () => {
        it('повинен успішно додавати новий рекорд через POST /api/scores', async () => {
            const res = await request(app)
                .post('/api/scores')
                .send({ nickname: 'QA_Hero', score: 1550, wave: 2 })
                .expect('Content-Type', /json/)
                .expect(201);

            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('recordId');
        });

        it('повинен повертати 400 при відсутності або некоректному нікнеймі', async () => {
            const res = await request(app)
                .post('/api/scores')
                .send({ nickname: 'A', score: 500 })
                .expect(400);

            expect(res.body).toHaveProperty('success', false);
            expect(res.body.message).toMatch(/від 2 до 15/i);
        });

        it('повинен повертати Топ-10 рекордів через GET /api/scores', async () => {
            const res = await request(app)
                .get('/api/scores')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('success', true);
            expect(Array.isArray(res.body.scores)).toBe(true);
            expect(res.body.scores.length).toBeGreaterThanOrEqual(1);
            expect(res.body.scores[0]).toHaveProperty('nickname');
            expect(res.body.scores[0]).toHaveProperty('score');
        });
    });
});
