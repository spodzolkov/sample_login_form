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

    // Валідація полів під час введення (приховування помилок)
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

    // Обробка посилання Sign Up
    if (signUpLink) {
        signUpLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'PAGES/signup.html';
        });
    }

    // Обробка сабміту форми (кнопка Login)
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            let isValid = true;
            emailError.textContent = '';
            passwordError.textContent = '';

            const emailVal = emailInput.value.trim();
            const passwordVal = passwordInput.value;

            // 1. Валідація Email
            // Маска: a@b.c, макс. довжина: 30
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

            // 2. Валідація Password
            // Допустимі символи: літери латинського алфавіту, цифри, _,!,@,#,$,%,^,*,(,)
            // Макс. довжина: 30
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

            // 3. Успішна валідація -> перехід до особистого кабінету
            if (isValid) {
                window.location.href = 'PAGES/dashboard.html';
            }
        });
    }
});
