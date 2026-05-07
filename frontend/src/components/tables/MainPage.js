import { BaseTable } from './BaseTable.js'

export class MainPage extends BaseTable {
  constructor() {
    super()
  }

  getTableName() {
    return 'main'
  }

  render() {
    return `
      <div class="table-card">
        <div class="text-center py-5">
          <div class="logo-square" style="margin: 0 auto 1.5rem auto; width: 80px; height: 80px; font-size: 2.5rem;">ПК</div>
          <h2 class="h4 mb-4">Добро пожаловать в панель администратора</h2>
          <p class="text-secondary mb-4">Выберите таблицу из бокового меню для управления данными</p>
          
          <div class="row" style="max-width: 1000px; margin: 2rem auto 0;">
            <div class="col-md-3 mb-3">
              <div class="dashboard-card p-4" style="background: rgba(37, 99, 235, 0.1); border-radius: 16px; border: 1px solid rgba(59, 130, 246, 0.3);">
                <h3 class="h6 mb-2">Товары</h3>
                <p class="text-secondary small">Управление каталогом товаров</p>
              </div>
            </div>
            <div class="col-md-3 mb-3">
              <div class="dashboard-card p-4" style="background: rgba(16, 185, 129, 0.1); border-radius: 16px; border: 1px solid rgba(16, 185, 129, 0.3);">
                <h3 class="h6 mb-2">Заказы</h3>
                <p class="text-secondary small">Просмотр и обработка заказов</p>
              </div>
            </div>
            <div class="col-md-3 mb-3">
              <div class="dashboard-card p-4" style="background: rgba(139, 92, 246, 0.1); border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.3);">
                <h3 class="h6 mb-2">Пользователи</h3>
                <p class="text-secondary small">Управление учётными записями</p>
              </div>
            </div>
            <div class="col-md-3 mb-3">
              <div class="dashboard-card p-4" style="background: rgba(245, 158, 11, 0.1); border-radius: 16px; border: 1px solid rgba(245, 158, 11, 0.3);">
                <h3 class="h6 mb-2">Отчёты</h3>
                <p class="text-secondary small">Аналитика и статистика</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }
}
