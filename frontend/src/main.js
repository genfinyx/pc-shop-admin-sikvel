import './styles/style.css'
import { startLoading } from './loading.js'
import { LoginPage, initLogin } from './pages/Login.js'
import { AdminPage } from './pages/AdminPage.js'
import { Session } from './services/Session.js'

const app = document.getElementById('app')

function showLogin() {
  app.innerHTML = LoginPage()
  app.style.display = 'block'
  initLogin(async () => {
    app.innerHTML = await AdminPage()
  })
}

const isLogout = localStorage.getItem('logout') === 'true'
const loadingTime = isLogout ? 1 : 7000

// Глобальная функция для отображения подробной справки
window.openHelp = () => {
  let modalContainer = document.getElementById('modalContainer')
  if (!modalContainer) {
    modalContainer = document.createElement('div')
    modalContainer.id = 'modalContainer'
    document.body.appendChild(modalContainer)
  }

  // SVG-иконки для разделов (размер 24x24, можно менять)
  const icons = {
    info: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    table: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>`,
    form: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5M14 10l6-6M3 16l5-5M5 21h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"></path><path d="M8 7h8M8 12h6M8 17h4"></path></svg>`,
    report: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3"></path><path d="M12 2v8l3-3-3-3-3 3 3 3z"></path></svg>`,
    close: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  }

  const modalHtml = `
    <div class="modal show" style="display: block; background: rgba(0,0,0,0.85);">
      <div class="modal-dialog modal-lg" style="max-width: 700px;">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${icons.info} Подробная справка по работе с панелью администратора</h5>
            <button type="button" class="btn-close" onclick="document.getElementById('modalContainer').innerHTML = '';">
              ${icons.close}
            </button>
          </div>
          <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
            
            <!-- РАЗДЕЛ 1: ОБЩИЕ СВЕДЕНИЯ -->
            <div class="help-section" style="margin-bottom: 1.5rem;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                ${icons.info}
                <h6 style="margin: 0;">1. Навигация и интерфейс</h6>
              </div>
              <p>В левой части экрана расположен <strong>сайдбар</strong> со списком всех справочников и журналов (Пользователи, Товары, Заказы, Отчёты и др.). Клик по названию таблицы загружает её содержимое в основной блок. Активная таблица подсвечивается синим градиентом.</p>
              <p>Верхняя панель (навбар) содержит кнопки для быстрого перехода к отчётам и выхода из системы. Справа отображается ваша роль (Администратор / Сотрудник).</p>
            </div>

            <!-- РАЗДЕЛ 2: РАБОТА С ТАБЛИЦАМИ -->
            <div class="help-section" style="margin-bottom: 1.5rem;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                ${icons.table}
                <h6 style="margin: 0;">2. Управление данными в таблицах</h6>
              </div>
              <ul style="padding-left: 1.2rem; margin-bottom: 0.5rem;">
                <li><strong>Поиск:</strong> Введите текст в поле поиска (в правом верхнем углу таблицы) и нажмите кнопку с лупой или Enter. Система найдёт записи по всем текстовым полям. Крестик слева очищает фильтр.</li>
                <li><strong>Пагинация:</strong> Если записей больше 8 на странице, внизу появляются номера страниц. Клик по номеру загружает следующую страницу. Активная страница выделена.</li>
                <li><strong>Добавление записи:</strong> Нажмите кнопку «+ Добавить» над таблицей, заполните появившуюся форму и нажмите «Сохранить». Обязательные поля отмечены звёздочкой.</li>
                <li><strong>Редактирование:</strong> В каждой строке таблицы нажмите кнопку с иконкой карандаша («Изменить»). Откроется форма с текущими значениями — измените нужные поля и сохраните.</li>
                <li><strong>Удаление:</strong> Кнопка с корзиной («Удалить») вызывает диалог подтверждения. Учтите, что удаление может быть каскадным (например, удаление категории удалит все товары в ней).</li>
              </ul>
              <p class="text-secondary">Примечание: В таблице «Пользователи» нельзя удалить собственную учётную запись — кнопка «Удалить» будет неактивна.</p>
            </div>

            <!-- РАЗДЕЛ 3: ОСОБЕННОСТИ ФОРМ -->
            <div class="help-section" style="margin-bottom: 1.5rem;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                ${icons.form}
                <h6 style="margin: 0;">3. Работа с формами</h6>
              </div>
              <ul style="padding-left: 1.2rem;">
                <li><strong>Выпадающие списки (select):</strong> Для выбора категории, статуса заказа, роли пользователя и т.д. — стилизованы под тёмную тему.</li>
                <li><strong>Поля с поиском (user, product, order):</strong> В формах добавления/редактирования заказа, корзины, отзыва и др. реализован динамический поиск. Начните вводить имя или название — появится выпадающий список с вариантами. Клик по нужному элементу заполнит скрытое поле ID и отобразит выбранное значение.</li>
                <li><strong>Даты и время:</strong> Поля типа datetime-local поддерживают выбор даты и времени через календарь. Если оставить пустым, часто подставляется текущая дата и время сервера.</li>
                <li><strong>Валидация:</strong> Перед сохранением форма проверяет обязательные поля, формат email, положительность количества/цены и т.п. Ошибки выводятся в виде уведомлений (красный тост).</li>
              </ul>
            </div>

            <!-- РАЗДЕЛ 4: ОТЧЁТЫ И ЭКСПОРТ -->
            <div class="help-section" style="margin-bottom: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                ${icons.report}
                <h6 style="margin: 0;">4. Отчёты и экспорт данных</h6>
              </div>
              <p>Кнопка «Отчёты» в навбаре открывает отдельную страницу, где доступны три вкладки: Приходные накладные, Расходные накладные и Чеки. Для каждой можно:</p>
              <ul style="padding-left: 1.2rem;">
                <li>Выбрать период дат (поле «С» и «По») и нажать «Применить» — таблица перестроится.</li>
                <li>Скачать отчёт в формате <strong>Excel</strong> (файл .xlsx) по шаблону товарной накладной — кнопка «Скачать Excel».</li>
                <li>Для чеков доступна кнопка «Печать», которая генерирует PDF-файл чека и скачивает его.</li>
              </ul>
              <p class="text-secondary mt-2">Сгенерированные файлы сохраняются в системную временную папку и автоматически удаляются после скачивания.</p>
            </div>

            <!-- НИЖНИЙ КОЛОНТИТУЛ -->
            <hr style="margin: 1rem 0 0.5rem;">
            <p class="text-secondary small text-center" style="margin-top: 1rem;">
              <br>Курсовая работа — Панель администратора интернет-магазина ПК.
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" onclick="document.getElementById('modalContainer').innerHTML = '';">
              Закрыть окно справки
            </button>
          </div>
        </div>
      </div>
    </div>
  `
  modalContainer.innerHTML = modalHtml
}

startLoading({
  totalTime: loadingTime,
  stages: [
    'Инициализация',
    'Подключение к базе данных',
    'Загрузка интерфейса',
    'Подготовка',
    'Почти готово',
    'Готово!',
  ],
  onFinish: () => {
    if (Session.isLoggedIn()) {
      AdminPage().then((html) => {
        app.innerHTML = html
        app.style.display = 'block'
      })
    } else {
      showLogin()
    }
  },
})

if (isLogout) {
  localStorage.removeItem('logout')
}
