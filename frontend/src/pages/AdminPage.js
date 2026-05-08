import '../styles/style.css'
import { Session } from '../services/Session.js'

const tables = [
  'main',
  'user',
  'product',
  'category',
  'order',
  'order_item',
  'cart_item',
  'delivery',
  'review',
  'wishlist',
  'invoice_in',
  'invoice_out',
  'receipt',
  'product_image',
]

// Сохраняем состояние текущей таблицы
let currentTableState = null

export async function AdminPage(restoreState = false) {
  const activeTable = Session.getActiveTable()

  // Если нужно восстановить состояние, возвращаем сохранённый HTML
  if (restoreState && currentTableState) {
    return currentTableState
  }

  const html = `
    <div id="adminPageRoot">
      <!-- НАВБАР -->
      <nav class="navbar navbar-expand-lg navbar-dark sticky-top sticky top-0">
        <div class="container-fluid">
          <a class="navbar-brand" href="#">
            <img 
              src="/logo.png" 
              width="906" 
              height="906" 
              alt="pcshop логотип"
              class="w-10 h-10 rounded-md"
            />
          </a>
          <div class="d-flex align-items-center ms-auto">
            <button class="btn btn-sm btn-reports me-2" onclick="window.openHelp()">Помощь</button>
            <button class="btn btn-sm btn-reports me-2" onclick="window.goToReports()">Отчёты</button>
            <button class="btn btn-sm btn-logout" onclick="window.logout()">Выйти</button>
          </div>
        </div>
      </nav>

      <!-- ОСНОВНОЙ КОНТЕНТ -->
      <div class="container-fluid py-4">
        <div class="row" style="display: flex; flex-wrap: nowrap; gap: 1rem;">
          <!-- САЙДБАР -->
          <div style="width: 250px; flex-shrink: 0;">
            <div class="sidebar">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h2 class="h6 mb-0 text-uppercase text-secondary">Справочники</h2>
                <span class="badge tables-count">${tables.length}</span>
              </div>
              <div class="list-group list-group-flush small">
                ${tables
                  .map(
                    (table) => `
                  <a href="#" 
                     class="list-group-item list-group-item-action ${table === activeTable ? 'active' : ''}"
                     onclick="window.changeTable('${table}'); return false;">
                    ${getTableDisplayName(table)}
                  </a>
                `,
                  )
                  .join('')}
              </div>
            </div>
          </div>

          <!-- КОНТЕЙНЕР ДЛЯ ТАБЛИЦЫ -->
          <div style="flex: 1; min-width: 0;">
            <div id="tableContainer"></div>
          </div>
        </div>
      </div>
      
      <!-- КОНТЕЙНЕР ДЛЯ МОДАЛКИ -->
      <div id="modalContainer"></div>
    </div>
  `

  // Сохраняем состояние
  currentTableState = html
  return html
}

// Глобальные функции
window.changeTable = async (tableName) => {
  console.log('changeTable called with:', tableName);

  // Сохраняем выбранную таблицу в сессии
  Session.setActiveTable(tableName);

  // Убираем активный класс со всех пунктов меню
  document.querySelectorAll('.list-group-item').forEach(el => {
    el.classList.remove('active');
  });

  // Находим пункт меню, соответствующий tableName, и добавляем ему класс active
  // Ищем по атрибуту onclick, который содержит 'changeTable(\'' + tableName + '\')'
  const targetMenuItem = Array.from(document.querySelectorAll('.list-group-item')).find(el => {
    const onclickAttr = el.getAttribute('onclick');
    return onclickAttr && onclickAttr.includes(`changeTable('${tableName}')`);
  });

  if (targetMenuItem) {
    targetMenuItem.classList.add('active');
  } else {
    // fallback: если не нашли, ищем по тексту (менее надёжно, но работает)
    const displayName = getTableDisplayNameInternal(tableName); // нужно определить внутри
    const menuByText = Array.from(document.querySelectorAll('.list-group-item')).find(el =>
      el.textContent.trim() === displayName
    );
    if (menuByText) menuByText.classList.add('active');
  }

  // Загружаем таблицу
  const { changeTable: changeTableComponent } = await import('../components/TableContainer.js');
  await changeTableComponent(tableName, {
    onEdit: (table, id) => console.log('Редактировать', table, id),
    onDelete: (table, id) => console.log('Удалить', table, id)
  });
};

// Вспомогательная функция для получения отображаемого имени таблицы (дублируется, но можно вынести)
function getTableDisplayNameInternal(table) {
  const names = {
    'main': 'Главная',
    'user': 'Пользователи',
    'product': 'Товары',
    'category': 'Категории',
    'order': 'Заказы',
    'order_item': 'Позиции заказов',
    'cart_item': 'Корзина',
    'delivery': 'Доставка',
    'review': 'Отзывы',
    'wishlist': 'Избранное',
    'invoice_in': 'Приходные накладные',
    'invoice_out': 'Расходные накладные',
    'receipt': 'Чеки',
    'product_image': 'Изображения товаров'
  };
  return names[table] || table;
}

window.goToReports = async () => {
  // Сохраняем состояние текущей страницы перед переходом
  const currentHtml = document.getElementById('app').innerHTML
  sessionStorage.setItem('savedAdminPage', currentHtml)

  const { ReportsPage } = await import('./ReportsPage.js')
  document.getElementById('app').innerHTML = ReportsPage()
}

window.goToAdmin = async () => {
  // Восстанавливаем сохранённое состояние
  const savedHtml = sessionStorage.getItem('savedAdminPage')
  if (savedHtml) {
    document.getElementById('app').innerHTML = savedHtml
    sessionStorage.removeItem('savedAdminPage')
  } else {
    const { AdminPage } = await import('./AdminPage.js')
    document.getElementById('app').innerHTML = await AdminPage()
  }
}

window.logout = () => {
  localStorage.setItem('logout', 'true')
  Session.logout()
  window.location.reload()
}

function getTableDisplayName(table) {
  const names = {
    main: 'Главная',
    user: 'Пользователи',
    product: 'Товары',
    category: 'Категории',
    order: 'Заказы',
    order_item: 'Позиции заказов',
    cart_item: 'Корзина',
    delivery: 'Доставка',
    review: 'Отзывы',
    wishlist: 'Избранное',
    invoice_in: 'Приходные накладные',
    invoice_out: 'Расходные накладные',
    receipt: 'Чеки',
    product_image: 'Изображения товаров',
  }

  setTimeout(async () => {
    const activeTable = Session.getActiveTable()
    const { changeTable } = await import('../components/TableContainer.js')
    await changeTable(activeTable, {
      onEdit: (table, id) => console.log('Редактировать', table, id),
      onDelete: (table, id) => console.log('Удалить', table, id),
    })
  }, 50)

  return names[table] || table
}

window.goToAdminGlobal = window.goToAdmin
