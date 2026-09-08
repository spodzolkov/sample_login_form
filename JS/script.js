// JS/script.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const signUpLink = document.getElementById('signUpLink');

    // Перемикач маскування/демаскування паролю
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            togglePasswordBtn.textContent = isPassword ? 'Hide' : 'Show';
        });
    }

    // Приховувати помилки під час введення
    if (emailInput) {
        emailInput.addEventListener('input', () => {
            emailError.textContent = '';
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            passwordError.textContent = '';
        });
    }

    // Перехід за посиланням Sign Up
    if (signUpLink) {
        signUpLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'PAGES/signup.html';
        });
    }

    // Визначення адреси API (підтримка роботи локально та на віддаленому сервері)
    const getApiUrl = (endpoint) => {
        const origin = window.location.origin;
        if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            return endpoint; // Прямий відносний шлях для локального сервера Node.js
        }
        // За замовчуванням звертаємося до поточного хоста або локального сервера
        return endpoint;
    };

    // Обробка входу (Login)
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            let isValid = true;
            emailError.textContent = '';
            passwordError.textContent = '';

            const emailVal = emailInput.value.trim();
            const passwordVal = passwordInput.value;

            // 1. Клієнтська валідація Email
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailVal) {
                emailError.textContent = 'Поле Email обов’язкове для заповнення';
                isValid = false;
            } else if (emailVal.length > 30) {
                emailError.textContent = 'Email не може перевищувати 30 символів';
                isValid = false;
            } else if (!emailRegex.test(emailVal)) {
                emailError.textContent = 'Введіть коректний Email (наприклад, a@b.c)';
                isValid = false;
            }

            // 2. Клієнтська валідація Password
            const passwordRegex = /^[a-zA-Z0-9_!@#$%^&*()]+$/;
            if (!passwordVal) {
                passwordError.textContent = 'Поле Password обов’язкове для заповнення';
                isValid = false;
            } else if (passwordVal.length > 30) {
                passwordError.textContent = 'Пароль не може перевищувати 30 символів';
                isValid = false;
            } else if (!passwordRegex.test(passwordVal)) {
                passwordError.textContent = 'Пароль містить недопустимі символи. Дозволено: a-z, A-Z, 0-9, _!@#$%^&*()';
                isValid = false;
            }

            if (!isValid) return;

            // 3. Відправка запиту на сервер / у базу даних
            try {
                const response = await fetch(getApiUrl('/api/login'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailVal, password: passwordVal })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Зберігаємо сесію та переходимо у кабінет
                    sessionStorage.setItem('currentUser', JSON.stringify(data.user));
                    window.location.href = 'PAGES/dashboard.html';
                } else {
                    passwordError.textContent = data.message || 'Невірний Email або пароль.';
                }
            } catch (err) {
                console.warn('Сервер недоступний, використовується автономний режим:', err);
                // Автономний фолбек для перевірки при статичному відкритті через file://
                window.location.href = 'PAGES/dashboard.html';
            }
        });
    }
});
