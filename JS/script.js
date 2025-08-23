// script.js

document.addEventListener('DOMContentLoaded', () => {
    // Отримання посилань на DOM-елементи
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePasswordButton = document.getElementById('togglePassword');
    const signupLink = document.getElementById('signupLink');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const messageBox = document.getElementById('messageBox');
    const messageTitle = document.getElementById('messageTitle');
    const messageText = document.getElementById('messageText');
    const messageCloseBtn = document.getElementById('messageCloseBtn');

    /**
     * Показує кастомне вікно повідомлення.
     * Використовується для виведення помилок валідації на поточній сторінці.
     * @param {string} title - Заголовок повідомлення.
     * @param {string} message - Текст повідомлення.
     */
    const showMessageBox = (title, message) => {
        messageTitle.textContent = title;
        messageText.textContent = message;
        messageBox.classList.remove('hidden');
    };

    /**
     * Приховує кастомне вікно повідомлення.
     */
    const hideMessageBox = () => {
        messageBox.classList.add('hidden');
    };

    // Обробник події для кнопки закриття повідомлення
    messageCloseBtn.addEventListener('click', hideMessageBox);

    // Функція валідації Email
    const validateEmail = (email) => {
        // Регулярний вираз для перевірки формату a@b.c
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailPattern.test(email)) {
            emailError.textContent = 'Будь ласка, введіть дійсну адресу електронної пошти (наприклад, a@b.c).';
            emailError.classList.remove('hidden');
            return false;
        }
        if (email.length > 64) {
            emailError.textContent = 'Email не може перевищувати 64 символи.';
            emailError.classList.remove('hidden');
            return false;
        }
        emailError.classList.add('hidden');
        return true;
    };

    // Функція валідації Password
    const validatePassword = (password) => {
        // Регулярний вираз для перевірки допустимих символів та максимальної довжини
        // Літери латинського алфавіту, цифри, _,!,@,#,$,%,^,&,*,(,)
        const passwordPattern = /^[a-zA-Z0-9_!@#$%^&*()]{1,64}$/;
        if (!passwordPattern.test(password)) {
            passwordError.textContent = 'Пароль може містити літери латинського алфавіту, цифри, та символи _!@#$%^&*().';
            passwordError.classList.remove('hidden');
            return false;
        }
        if (password.length > 64) {
            passwordError.textContent = 'Пароль не може перевищувати 64 символи.';
            passwordError.classList.remove('hidden');
            return false;
        }
        passwordError.classList.add('hidden');
        return true;
    };

    // Обробник події для перемикання видимості пароля
    togglePasswordButton.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePasswordButton.textContent = type === 'password' ? 'Показати' : 'Приховати';
    });

    // Обробник події для відправки форми (кнопка "Увійти")
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Запобігаємо стандартній відправці форми

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        const isEmailValid = validateEmail(email);
        const isPasswordValid = validatePassword(password);

        if (isEmailValid && isPasswordValid) {
            // Всі поля заповнені вірно, перенаправляємо на сторінку особистого кабінету
            window.location.href = 'PAGES/dashboard.html';
        } else {
            // Якщо валідація не пройшла, повідомлення про помилки вже відображено в messageBox
            showMessageBox(
                'Помилка входу',
                'Будь ласка, перевірте правильність введених даних.'
            );
        }
    });

    // Обробник події для посилання "Зареєструватися"
    signupLink.addEventListener('click', (event) => {
        event.preventDefault(); // Запобігаємо стандартній поведінці посилання
        // Перенаправляємо на сторінку реєстрації
        window.location.href = 'PAGES/signup.html';
    });

    // Додаємо слухачів подій `input` для полів, щоб приховувати помилки під час введення
    emailInput.addEventListener('input', () => {
        emailError.classList.add('hidden');
        hideMessageBox(); // Приховуємо загальне повідомлення про помилку під час введення
    });

    passwordInput.addEventListener('input', () => {
        passwordError.classList.add('hidden');
        hideMessageBox(); // Приховуємо загальне повідомлення про помилку під час введення
    });
});
