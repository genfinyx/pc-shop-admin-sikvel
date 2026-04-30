import '../styles/style.css';
import '../styles/login.css';
import { Session } from '../services/Session.js';

export function LoginPage() {
  return `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="d-flex align-items-center mb-4">
          <div class="logo-square">ПК</div>
          <div>
            <div class="brand-title">Панель администратора</div>
            <div class="brand-subtitle">Управление магазином</div>
          </div>
        </div>

        <form id="loginForm">
          <div class="mb-4">
            <label class="form-label">Логин</label>
            <input type="text" name="username" class="form-control" placeholder="Введите логин" required>
          </div>
          <div class="mb-4">
            <label class="form-label">Пароль</label>
            <input type="password" name="password" class="form-control" placeholder="Введите пароль" required>
          </div>
          <button type="submit" class="btn-primary w-100">Войти</button>
        </form>
        
        <div class="mt-4 text-center">
          <span class="footer-text">
            Только для администраторов и сотрудников
          </span>
        </div>

        <div id="loginError" class="error-message"></div>
      </div>
    </div>
  `;
}

export function initLogin(onSuccess) {
  console.log('initLogin вызван');

  const form = document.getElementById('loginForm');
  const errorDiv = document.getElementById('loginError');

  if (!form) {
    console.error('Форма входа не найдена!');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = form.username.value;
    const password = form.password.value;

    errorDiv.style.display = 'none';

    try {
      const result = await window.go.main.App.Login(username, password);
      console.log('Результат входа из Go:', result);

      if (result.success) {
        console.log('Сохранение пользователя с ID:', result.userId);

        Session.setUser({
          id: result.userId,
          username: result.username,
          role: result.role,
          firstName: result.firstName,
          lastName: result.lastName,
          middleName: result.middleName,
          email: result.email
        });

        console.log('Сессия после сохранения:', Session.getUser());
        console.log('ID пользователя в сессии:', Session.getUserId());

        onSuccess();
      } else {
        errorDiv.style.display = 'block';
        errorDiv.textContent = result.message || 'Неверный логин или пароль';
      }
    } catch (error) {
      errorDiv.style.display = 'block';
      errorDiv.textContent = 'Ошибка входа: ' + error.message;
    }
  });
}