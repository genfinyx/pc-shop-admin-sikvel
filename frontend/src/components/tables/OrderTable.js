import { BaseTable } from './BaseTable.js'
import { Toast } from '../../services/Toast.js'

export class OrderTable extends BaseTable {
  constructor() {
    super()
    this.editId = null
    this.formData = {}
    this.rowHeight = 53
    this.users = []
    this.data = { columns: [], rows: [], total: 0 }
  }

  getTableName() {
    return 'order'
  }

  getColumnNames() {
    return {
      order_id: 'ID',
      order_number: 'Номер заказа',
      user_id: 'Пользователь',
      status: 'Статус',
      payment_method: 'Способ оплаты',
      payment_status: 'Статус оплаты',
      order_date: 'Дата заказа',
      notes: 'Примечания',
    }
  }

  async handleSearch(event) {
    if (event) event.preventDefault()
    const input = document.getElementById('searchInput')
    this.currentSearch = input ? input.value : ''
    this.currentPage = 1
    await this.load(this.currentPage, this.currentSearch)
    const { renderTable } = await import('../TableContainer.js')
    await renderTable('order', 'tableContainer', {
      onEdit: (table, id) => console.log('Edit', table, id),
      onDelete: (table, id) => console.log('Delete', table, id),
    })
  }

  async handleSearchClear() {
    this.currentSearch = ''
    this.currentPage = 1
    const input = document.getElementById('searchInput')
    if (input) input.value = ''
    await this.load(this.currentPage, this.currentSearch)
    const { renderTable } = await import('../TableContainer.js')
    await renderTable('order', 'tableContainer', {
      onEdit: (table, id) => console.log('Edit', table, id),
      onDelete: (table, id) => console.log('Delete', table, id),
    })
  }

  async load(page = 1, search = '') {
    this.currentPage = page
    this.currentSearch = search
    await this.loadData('order', page, search)
    await this.loadUsers()
  }

  async loadData(table, page, search) {
    try {
      const result = await window.go.main.App.GetTableData(
        table,
        page,
        search,
        this.perPage,
      )
      this.data = result
      return result
    } catch (error) {
      Toast.error('Ошибка загрузки данных: ' + error.message)
      this.data = { columns: [], rows: [], total: 0 }
      throw error
    }
  }

  async loadUsers() {
    try {
      const result = await window.go.main.App.GetTableData('user', 1, '', 1000)
      this.users = result.rows || []
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error)
      this.users = []
    }
  }

  async changePage(page) {
    this.currentPage = page
    await this.load(this.currentPage, this.currentSearch)
    const { renderTable } = await import('../TableContainer.js')
    await renderTable('order', 'tableContainer', {
      onEdit: (table, id) => console.log('Edit', table, id),
      onDelete: (table, id) => console.log('Delete', table, id),
    })
  }

  getUserName(userId) {
    if (!userId) return '<span class="text-secondary">—</span>'
    const user = this.users.find((u) => u.idUser == userId)
    if (user) {
      return (
        `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
        user.username ||
        String(userId)
      )
    }
    return String(userId)
  }

  getUserNameForInput(userId) {
    if (!userId) return ''
    const user = this.users.find((u) => u.idUser == userId)
    if (user) {
      return `${user.first_name || ''} ${user.last_name || ''} (${user.username || ''})`.trim()
    }
    return ''
  }

  filterUsers(searchText) {
    const dropdown = document.getElementById('userDropdown')
    if (!dropdown) return

    if (!searchText || searchText.trim() === '') {
      dropdown.style.display = 'none'
      return
    }

    const searchLower = searchText.toLowerCase()
    const filtered = this.users.filter((user) => {
      const fullName =
        `${user.first_name || ''} ${user.last_name || ''} ${user.username || ''}`.toLowerCase()
      return fullName.includes(searchLower)
    })

    if (filtered.length === 0) {
      dropdown.innerHTML =
        '<div class="p-2 text-secondary" style="padding: 8px 12px;">Ничего не найдено</div>'
      dropdown.style.display = 'block'
      return
    }

    dropdown.innerHTML = filtered
      .map((user) => {
        const displayText =
          `${user.first_name || ''} ${user.last_name || ''} (${user.username || ''})`.trim()
        const escapedText = displayText
          .replace(/'/g, "\\'")
          .replace(/"/g, '&quot;')
        return `
        <div class="user-dropdown-item" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #374151;" onclick="tables.order.selectUser(${user.idUser}, '${escapedText}')">
          ${displayText}
          <small style="color: #9ca3af; display: block; font-size: 0.75rem;">ID: ${user.idUser}</small>
        </div>
      `
      })
      .join('')

    dropdown.style.display = 'block'

    const input = document.getElementById('userSearchInput')
    if (input) {
      const rect = input.getBoundingClientRect()
      dropdown.style.position = 'absolute'
      dropdown.style.top = `${rect.bottom + window.scrollY}px`
      dropdown.style.left = `${rect.left + window.scrollX}px`
      dropdown.style.width = `${rect.width}px`
    }

    dropdown.querySelectorAll('.user-dropdown-item').forEach((item) => {
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#374151'
      })
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent'
      })
    })
  }

  selectUser(userId, displayName) {
    const input = document.getElementById('userSearchInput')
    const hiddenInput = document.getElementById('selectedUserId')
    const dropdown = document.getElementById('userDropdown')

    if (input) input.value = displayName
    if (hiddenInput) hiddenInput.value = userId
    if (dropdown) dropdown.style.display = 'none'
  }

  formatDateTime(dateString) {
    if (!dateString) return '<span class="text-secondary">—</span>'
    try {
      const date = new Date(dateString)
      return (
        date.toLocaleDateString('ru-RU') +
        ' ' +
        date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      )
    } catch (e) {
      return String(dateString)
    }
  }

  formatDateTimeForInput(dateString) {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    } catch (e) {
      return ''
    }
  }

  validateForm(data) {
    const errors = []
    if (!data.user_id || data.user_id === '') {
      errors.push('Пользователь обязателен')
    }
    return errors
  }

  async createOrder(data) {
    try {
      const result = await window.go.main.App.CreateOrder(data)
      if (result.success) {
        this.closeModal()
        await this.load(this.currentPage, this.currentSearch)
        Toast.success('Заказ успешно создан')
        const { renderTable } = await import('../TableContainer.js')
        await renderTable('order', 'tableContainer', {
          onEdit: (table, id) => console.log('Edit', table, id),
          onDelete: (table, id) => console.log('Delete', table, id),
        })
      } else {
        Toast.error(result.message)
      }
    } catch (error) {
      Toast.error('Ошибка: ' + error.message)
    }
  }

  async updateOrder(id, data) {
    try {
      const result = await window.go.main.App.UpdateOrder(id, data)
      if (result.success) {
        this.closeModal()
        await this.load(this.currentPage, this.currentSearch)
        Toast.success('Заказ успешно обновлён')
        const { renderTable } = await import('../TableContainer.js')
        await renderTable('order', 'tableContainer', {
          onEdit: (table, id) => console.log('Edit', table, id),
          onDelete: (table, id) => console.log('Delete', table, id),
        })
      } else {
        Toast.error(result.message)
      }
    } catch (error) {
      Toast.error('Ошибка: ' + error.message)
    }
  }

  async deleteOrder(id) {
    try {
      const result = await window.go.main.App.DeleteOrder(id)
      if (result.success) {
        await this.load(this.currentPage, this.currentSearch)
        Toast.success('Заказ успешно удалён')
        const { renderTable } = await import('../TableContainer.js')
        await renderTable('order', 'tableContainer', {
          onEdit: (table, id) => console.log('Edit', table, id),
          onDelete: (table, id) => console.log('Delete', table, id),
        })
      } else {
        Toast.error(result.message)
      }
    } catch (error) {
      Toast.error('Ошибка: ' + error.message)
    }
  }

  openCreateForm() {
    this.editId = null
    this.formData = {}
    this.renderModal()
  }

  async openEditForm(id) {
    this.editId = id
    const data = await this.loadOrderData(id)
    if (data) {
      this.formData = data
      this.renderModal()
    }
  }

  async loadOrderData(id) {
    try {
      return await window.go.main.App.GetOrder(id)
    } catch (error) {
      Toast.error('Ошибка загрузки данных заказа: ' + error.message)
      return null
    }
  }

  showDeleteModal(id) {
    const order = this.data.rows?.find((row) => row.order_id == id)
    const orderNumber = order?.order_number || `#${id}`

    let modalContainer = document.getElementById('modalContainer')
    if (!modalContainer) {
      modalContainer = document.createElement('div')
      modalContainer.id = 'modalContainer'
      document.body.appendChild(modalContainer)
    }

    const modalHtml = `
      <div class="modal show" style="display: block; background: rgba(0,0,0,0.7);">
        <div class="modal-dialog" style="max-width: 400px;">
          <div class="modal-content">
            <div class="modal-header" style="border-bottom-color: #ef4444;">
              <h5 class="modal-title text-danger">Подтверждение удаления</h5>
              <button type="button" class="btn-close" onclick="tables.user.closeModal()">
                <svg width="128" height="128" viewBox="0 0 64 64" stroke="#9ca3af" stroke-width="3px" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.6066 21.3934C22.2161 21.0029 21.5829 21.0029 21.1924 21.3934C20.8019 21.7839 20.8019 22.4171 21.1924 22.8076L22.6066 21.3934ZM40.9914 42.6066C41.3819 42.9971 42.0151 42.9971 42.4056 42.6066C42.7961 42.2161 42.7961 41.5829 42.4056 41.1924L40.9914 42.6066ZM21.1924 41.1924C20.8019 41.5829 20.8019 42.2161 21.1924 42.6066C21.5829 42.9971 22.2161 42.9971 22.6066 42.6066L21.1924 41.1924ZM42.4056 22.8076C42.7961 22.4171 42.7961 21.7839 42.4056 21.3934C42.0151 21.0029 41.3819 21.0029 40.9914 21.3934L42.4056 22.8076ZM21.1924 22.8076L40.9914 42.6066L42.4056 41.1924L22.6066 21.3934L21.1924 22.8076ZM22.6066 42.6066L42.4056 22.8076L40.9914 21.3934L21.1924 41.1924L22.6066 42.6066Z" fill="black"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <p>Вы уверены, что хотите удалить заказ <strong>${orderNumber}</strong>?</p>
              <p class="text-secondary">Это действие нельзя отменить.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-cancel" onclick="tables.order.closeDeleteModal()">Отмена</button>
              <button type="button" class="btn btn-delete" onclick="tables.order.confirmDelete(${id})">Удалить</button>
            </div>
          </div>
        </div>
      </div>
    `

    modalContainer.innerHTML = modalHtml
  }

  closeDeleteModal() {
    document.getElementById('modalContainer').innerHTML = ''
  }

  async confirmDelete(id) {
    this.closeDeleteModal()
    await this.deleteOrder(id)
  }

  closeModal() {
    document.getElementById('modalContainer').innerHTML = ''
  }

  renderModal() {
    const title = this.editId ? 'Редактировать заказ' : 'Новый заказ'

    const statusOptions = {
      new: 'Новый',
      processing: 'В обработке',
      paid: 'Оплачен',
      cancelled: 'Отменён',
      completed: 'Завершён',
    }

    const paymentMethodOptions = {
      cash: 'Наличные',
      card_online: 'Карта онлайн',
      card_courier: 'Карта курьеру',
      invoice: 'Счёт',
    }

    const paymentStatusOptions = {
      pending: 'Ожидает',
      paid: 'Оплачен',
      refunded: 'Возврат',
    }

    const modalHtml = `
      <div class="modal show" style="display: block; background: rgba(0,0,0,0.7);">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${title}</h5>
              <button type="button" class="btn-close" onclick="tables.order.closeModal()"><svg width="128" height="128" viewBox="0 0 64 64" stroke="#9ca3af" stroke-width="3px" xmlns="http://www.w3.org/2000/svg"><path d="M22.6066 21.3934C22.2161 21.0029 21.5829 21.0029 21.1924 21.3934C20.8019 21.7839 20.8019 22.4171 21.1924 22.8076L22.6066 21.3934ZM40.9914 42.6066C41.3819 42.9971 42.0151 42.9971 42.4056 42.6066C42.7961 42.2161 42.7961 41.5829 42.4056 41.1924L40.9914 42.6066ZM21.1924 41.1924C20.8019 41.5829 20.8019 42.2161 21.1924 42.6066C21.5829 42.9971 22.2161 42.9971 22.6066 42.6066L21.1924 41.1924ZM42.4056 22.8076C42.7961 22.4171 42.7961 21.7839 42.4056 21.3934C42.0151 21.0029 41.3819 21.0029 40.9914 21.3934L42.4056 22.8076ZM21.1924 22.8076L40.9914 42.6066L42.4056 41.1924L22.6066 21.3934L21.1924 22.8076ZM22.6066 42.6066L42.4056 22.8076L40.9914 21.3934L21.1924 41.1924L22.6066 42.6066Z" fill="black"/></svg></button>
            </div>
            <div class="modal-body">
              <form id="orderForm" onsubmit="tables.order.saveForm(event)">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Номер заказа</label>
                    <input type="text" name="order_number" class="form-control" value="${this.formData.order_number || ''}" placeholder="Авто-генерация, если пусто">
                    <span class="text-secondary">Формат: ORD-2025-001</span>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Пользователь <span class="text-danger">*</span></label>
                    <input type="text" id="userSearchInput" class="form-control" placeholder="Введите имя, фамилию или логин для поиска..." autocomplete="off" oninput="tables.order.filterUsers(this.value)" value="${this.getUserNameForInput(this.formData.user_id)}">
                    <input type="hidden" name="user_id" id="selectedUserId" value="${this.formData.user_id || ''}">
                    <div id="userDropdown" class="user-dropdown" style="display: none; position: absolute; background: #1f2937; border: 1px solid #4b5563; border-radius: 6px; max-height: 200px; overflow-y: auto; z-index: 1000; min-width: 200px;"></div>
                    <span class="text-secondary">Начните вводить имя, фамилию или логин</span>
                  </div>
                  <div class="col-md-4 mb-3">
                    <label class="form-label">Статус</label>
                    <select name="status" class="form-select">
                      ${Object.entries(statusOptions)
                        .map(
                          ([value, label]) =>
                            `<option value="${value}" ${this.formData.status === value ? 'selected' : ''}>${label}</option>`,
                        )
                        .join('')}
                    </select>
                  </div>
                  <div class="col-md-4 mb-3">
                    <label class="form-label">Способ оплаты</label>
                    <select name="payment_method" class="form-select">
                      <option value="">— Не выбран —</option>
                      ${Object.entries(paymentMethodOptions)
                        .map(
                          ([value, label]) =>
                            `<option value="${value}" ${this.formData.payment_method === value ? 'selected' : ''}>${label}</option>`,
                        )
                        .join('')}
                    </select>
                  </div>
                  <div class="col-md-4 mb-3">
                    <label class="form-label">Статус оплаты</label>
                    <select name="payment_status" class="form-select">
                      ${Object.entries(paymentStatusOptions)
                        .map(
                          ([value, label]) =>
                            `<option value="${value}" ${this.formData.payment_status === value ? 'selected' : ''}>${label}</option>`,
                        )
                        .join('')}
                    </select>
                  </div>
                  <div class="col-12 mb-3">
                    <label class="form-label">Примечания</label>
                    <textarea name="notes" class="form-control" rows="3">${this.formData.notes || ''}</textarea>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Дата заказа</label>
                    <input type="datetime-local" name="order_date" class="form-control" value="${this.formatDateTimeForInput(this.formData.order_date)}">
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-cancel" onclick="tables.order.closeModal()">Отмена</button>
              <button type="submit" class="btn btn-save" form="orderForm">Сохранить</button>
            </div>
          </div>
        </div>
      </div>
    `
    document.getElementById('modalContainer').innerHTML = modalHtml

    setTimeout(() => {
      const handleClickOutside = (e) => {
        const userDropdown = document.getElementById('userDropdown')
        const userInput = document.getElementById('userSearchInput')
        if (
          userDropdown &&
          userInput &&
          !userInput.contains(e.target) &&
          !userDropdown.contains(e.target)
        ) {
          userDropdown.style.display = 'none'
        }
      }
      document.addEventListener('click', handleClickOutside)
    }, 100)
  }

  async saveForm(e) {
    e.preventDefault()
    const form = e.target
    const formData = new FormData(form)
    const data = Object.fromEntries(formData.entries())

    const hiddenUserId = document.getElementById('selectedUserId')?.value
    if (hiddenUserId && !data.user_id) {
      data.user_id = hiddenUserId
    }

    for (let key in data) {
      if (data[key] === '') data[key] = null
    }

    const errors = this.validateForm(data)
    if (errors.length > 0) {
      Toast.error(errors.join('<br>'))
      return
    }

    if (this.editId) {
      await this.updateOrder(this.editId, data)
    } else {
      await this.createOrder(data)
    }
  }

  formatCellValue(column, value) {
    if (value === null || value === undefined)
      return '<span class="text-secondary">—</span>'
    if (column === 'user_id') return this.getUserName(value)
    if (column === 'order_date') return this.formatDateTime(value)
    if (column === 'status') {
      const statusMap = {
        new: 'Новый',
        processing: 'В обработке',
        paid: 'Оплачен',
        cancelled: 'Отменён',
        completed: 'Завершён',
      }
      return statusMap[value] || value
    }
    if (column === 'payment_method') {
      const methodMap = {
        cash: 'Наличные',
        card_online: 'Карта онлайн',
        card_courier: 'Карта курьеру',
        invoice: 'Счёт',
      }
      return (
        methodMap[value] || value || '<span class="text-secondary">—</span>'
      )
    }
    if (column === 'payment_status') {
      const statusMap = {
        pending: 'Ожидает',
        paid: 'Оплачен',
        refunded: 'Возврат',
      }
      return statusMap[value] || value
    }
    return String(value)
  }

  renderRow(row, columns) {
    return `
      <tr>
        ${columns.map((col) => `<td>${this.formatCellValue(col, row[col])}</td>`).join('')}
        <td class="text-end">
          <button class="btn btn-edit" onclick="tables.order.openEditForm(${row.order_id})">Изменить</button>
          <button class="btn btn-delete" onclick="tables.order.showDeleteModal(${row.order_id})">Удалить</button>
        </td>
      </tr>
    `
  }

  render(options = {}) {
    const { onSearch, onPageChange } = options

    if (!this.data.rows || this.data.rows.length === 0) {
      return this.renderEmptyState('Заказы')
    }

    const columnNames = this.getColumnNames()
    const columns = (this.data && this.data.columns) || Object.keys(columnNames)
    const displayRows = [...this.data.rows]
    while (displayRows.length < this.perPage) displayRows.push(null)

    return `
      <div class="table-card">
        <div class="table-header">
          <div class="table-header-left">
            <h2>Заказы</h2>
            <span class="text-secondary">Всего: ${this.data.total}</span>
          </div>
          <div class="table-header-right">
            ${this.renderSearch(onSearch, this.currentSearch)}
            <button class="btn btn-primary" onclick="tables.order.openCreateForm()">+ Добавить</button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                ${columns.map((col) => `<th>${columnNames[col] || col}</th>`).join('')}
                <th class="text-end">Действия</th>
              </tr>
            </thead>
            <tbody>
              ${displayRows
                .map((row) => {
                  if (!row) {
                    return `<tr>${columns.map(() => '<td>&nbsp;</td>').join('')}<td>&nbsp;</td></tr>`
                  }
                  return this.renderRow(row, columns)
                })
                .join('')}
            </tbody>
          </table>
        </div>
        ${this.renderPagination(onPageChange)}
      </div>
    `
  }
}

if (!window.tables) window.tables = {}
window.tables.order = new OrderTable()
