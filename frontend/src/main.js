import './styles/style.css';
import { startLoading } from './loading.js';
import { LoginPage, initLogin } from './pages/Login.js';
import { AdminPage } from './pages/AdminPage.js';
import { Session } from './services/Session.js';

const app = document.getElementById('app');

function showLogin() {
  app.innerHTML = LoginPage();
  app.style.display = 'block';
  initLogin(async () => {
    app.innerHTML = await AdminPage();
  });
}

const isLogout = localStorage.getItem('logout') === 'true';
const loadingTime = isLogout ? 1 : 7000;

startLoading({
  totalTime: loadingTime,
  stages: [
    'Инициализация',
    'Подключение к базе данных',
    'Загрузка интерфейса',
    'Подготовка',
    'Почти готово',
    'Готово!'
  ],
  onFinish: () => {
    if (Session.isLoggedIn()) {
      AdminPage().then(html => {
        app.innerHTML = html;
        app.style.display = 'block';
      });
    } else {
      showLogin();
    }
  }
});

if (isLogout) {
  localStorage.removeItem('logout');
}