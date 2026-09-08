// JS/script.js - Версія з навмисно доданими 5 дефектами для QA тестування

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const signUpLink = document.getElementById('signUpLink');

    // ДЕФЕКТ 1: Кнопка приховання/відображення паролю працює навпаки
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            // НАВПАКИ: коли пароль відкритий (text) -> пише Show, коли прихований (password) -> пише Hide
            togglePasswordBtn.textContent = isPassword ? 'Show' : 'Hide';
        });
    }

    if (emailInput) {
        emailInput.addEventListener('input', () => {
            emailError.textContent = '';
            passwordError.textContent = '';
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            passwordError.textContent = '';
        });
    }

    // ДЕФЕКТ 4: Перенаправлення Sign Up веде на саму сторінку входу замість сторінки реєстрації
    if (signUpLink) {
        signUpLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'index.html'; // Помилковий редирект
        });
    }

    const getApiUrl = (endpoint) => {
        return endpoint;
    };

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            let isValid = true;
            emailError.textContent = '';
            passwordError.textContent = '';

            const emailVal = emailInput.value.trim();
            const passwordVal = passwordInput.value;

            // ДЕФЕКТ 2: Зламаний регулярний вираз для Email (пропускає невалідні адреси без TLD домену, наприклад "user@domain")
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$/; // Відсутня перевірка \.[a-zA-Z]{2,}
            
            if (!emailVal) {
                // ДЕФЕКТ 5: Помилка Email виводиться у блок passwordError під полем Пароля замість emailError
                passwordError.textContent = 'Поле Email обов’язкове для заповнення';
                isValid = false;
            } else if (!emailRegex.test(emailVal)) {
                // ДЕФЕКТ 5: Виведення помилки Email в невірний блок
                passwordError.textContent = 'Введіть коректний Email (наприклад, a@b.c)';
                isValid = false;
            }

            // Валідація Password
            const passwordRegex = /^[a-zA-Z0-9_!@#$%^&*()]+$/;
            if (!passwordVal) {
                passwordError.textContent = 'Поле Password обов’язкове для заповнення';
                isValid = false;
            } else if (!passwordRegex.test(passwordVal)) {
                passwordError.textContent = 'Пароль містить недопустимі символи. Дозволено: a-z, A-Z, 0-9, _!@#$%^&*()';
                isValid = false;
            }

            if (!isValid) return;

            try {
                const response = await fetch(getApiUrl('/api/login'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailVal, password: passwordVal })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    sessionStorage.setItem('currentUser', JSON.stringify(data.user));
                    window.location.href = 'PAGES/dashboard.html';
                } else {
                    passwordError.textContent = data.message || 'Невірний Email або пароль.';
                }
            } catch (err) {
                console.warn('Автономний режим:', err);
                window.location.href = 'PAGES/dashboard.html';
            }
        });
    }
});
