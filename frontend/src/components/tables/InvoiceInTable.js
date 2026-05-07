import { BaseTable } from './BaseTable.js'
import { Toast } from '../../services/Toast.js'

export class InvoiceInTable extends BaseTable {
  constructor() {
    super()
    this.editId = null
    this.formData = {}
    this.rowHeight = 53
    this.products = []
    this.data = { columns: [], rows: [], total: 0 }
  }

  getTableName() {
    return 'invoice_in'
  }

  getColumnNames() {
    return {
      invoice_in_id: 'ID',
      invoice_number: 'Номер накладной',
      invoice_date: 'Дата',
      product_id: 'Товар',
      quantity: 'Количество',
      purchase_price: 'Цена закупки',
      supplier: 'Поставщик',
      created_at: 'Создано',
    }
  }

  // ========== ЗАГРУЗКА ДАННЫХ ==========
  async load(page = 1, search = '') {
    this.currentPage = page
    this.currentSearch = search
    await this.loadData('invoice_in', page, search)
    await this.loadProducts()
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

  async loadProducts() {
    try {
      const result = await window.go.main.App.GetTableData(
        'product',
        1,
        '',
        1000,
      )
      this.products = result.rows || []
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error)
      this.products = []
    }
  }

  async changePage(page) {
    this.currentPage = page
    await this.load(this.currentPage, this.currentSearch)
    const { renderTable } = await import('../TableContainer.js')
    await renderTable('invoice_in', 'tableContainer', {
      onEdit: (table, id) => console.log('Edit', table, id),
      onDelete: (table, id) => console.log('Delete', table, id),
    })
  }

  // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
  getProductName(productId) {
    if (!productId) return '<span class="text-secondary">—</span>'
    const product = this.products.find((p) => p.product_id == productId)
    if (product) {
      return product.name || String(productId)
    }
    return String(productId)
  }

  getProductNameForInput(productId) {
    if (!productId) return ''
    const product = this.products.find((p) => p.product_id == productId)
    if (product) {
      return product.name
    }
    return ''
  }

  // ========== ПОИСК В МОДАЛКЕ (ТОВАРЫ) ==========
  filterProducts(searchText) {
    const dropdown = document.getElementById('productDropdown')
    if (!dropdown) return

    if (!searchText || searchText.trim() === '') {
      dropdown.style.display = 'none'
      return
    }

    const searchLower = searchText.toLowerCase()
    const filtered = this.products.filter((product) => {
      const productName = (product.name || '').toLowerCase()
      const productId = String(product.product_id || '')
      return (
        productName.includes(searchLower) || productId.includes(searchLower)
      )
    })

    if (filtered.length === 0) {
      dropdown.innerHTML =
        '<div class="p-2 text-secondary" style="padding: 8px 12px;">Ничего не найдено</div>'
      dropdown.style.display = 'block'
      return
    }

    dropdown.innerHTML = filtered
      .map((product) => {
        const displayText = product.name || `Товар #${product.product_id}`
        const escapedText = displayText
          .replace(/'/g, "\\'")
          .replace(/"/g, '&quot;')
        return `
        <div class="product-dropdown-item" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #374151;" onclick="tables.invoice_in.selectProduct(${product.product_id}, '${escapedText}')">
          ${displayText}
          <small style="color: #9ca3af; display: block; font-size: 0.75rem;">ID: ${product.product_id}</small>
        </div>
      `
      })
      .join('')

    dropdown.style.display = 'block'

    const input = document.getElementById('productSearchInput')
    if (input) {
      const rect = input.getBoundingClientRect()
      dropdown.style.position = 'absolute'
      dropdown.style.top = `${rect.bottom + window.scrollY}px`
      dropdown.style.left = `${rect.left + window.scrollX}px`
      dropdown.style.width = `${rect.width}px`
    }

    dropdown.querySelectorAll('.product-dropdown-item').forEach((item) => {
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#374151'
      })
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent'
      })
    })
  }

  selectProduct(productId, displayName) {
    const input = document.getElementById('productSearchInput')
    const hiddenInput = document.getElementById('selectedProductId')
    const dropdown = document.getElementById('productDropdown')

    if (input) input.value = displayName
    if (hiddenInput) hiddenInput.value = productId
    if (dropdown) dropdown.style.display = 'none'
  }

  // ========== ФУНКЦИИ ДАТЫ ==========
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

  // ========== CRUD ОПЕРАЦИИ ==========
  async createInvoiceIn(data) {
    try {
      const result = await window.go.main.App.CreateInvoiceIn(data)
      if (result.success) {
        this.closeModal()
        await this.load(this.currentPage, this.currentSearch)
        Toast.success('Приходная накладная создана')
        const { renderTable } = await import('../TableContainer.js')
        await renderTable('invoice_in', 'tableContainer', {
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

  async updateInvoiceIn(id, data) {
    try {
      const result = await window.go.main.App.UpdateInvoiceIn(id, data)
      if (result.success) {
        this.closeModal()
        await this.load(this.currentPage, this.currentSearch)
        Toast.success('Приходная накладная обновлена')
        const { renderTable } = await import('../TableContainer.js')
        await renderTable('invoice_in', 'tableContainer', {
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

  async deleteInvoiceIn(id) {
    try {
      const result = await window.go.main.App.DeleteInvoiceIn(id)
      if (result.success) {
        await this.load(this.currentPage, this.currentSearch)
        Toast.success('Приходная накладная удалена')
        const { renderTable } = await import('../TableContainer.js')
        await renderTable('invoice_in', 'tableContainer', {
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

  // ========== ФУНКЦИИ ВАЛИДАЦИИ ==========
  validateForm(data) {
    const errors = []
    if (!data.product_id || data.product_id === '') {
      errors.push('Товар обязателен')
    }
    if (!data.quantity || data.quantity <= 0) {
      errors.push('Количество должно быть положительным')
    }
    if (!data.purchase_price || data.purchase_price <= 0) {
      errors.push('Цена закупки должна быть положительной')
    }
    return errors
  }

  // ========== МОДАЛЬНЫЕ ОКНА ==========
  openCreateForm() {
    this.editId = null
    this.formData = {}
    this.renderModal()
  }

  async openEditForm(id) {
    this.editId = id
    const data = await this.loadInvoiceInData(id)
    if (data) {
      this.formData = data
      this.renderModal()
    }
  }

  async loadInvoiceInData(id) {
    try {
      const data = await window.go.main.App.GetInvoiceIn(id)
      return data
    } catch (error) {
      Toast.error('Ошибка загрузки данных накладной: ' + error.message)
      return null
    }
  }

  showDeleteModal(id) {
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
              <button type="button" class="btn-close" onclick="tables.invoice_in.closeDeleteModal()">
                <svg width="128" height="128" viewBox="0 0 64 64" stroke="#9ca3af" stroke-width="3px" xmlns="http://www.w3.org/2000/svg"><path d="M22.6066 21.3934C22.2161 21.0029 21.5829 21.0029 21.1924 21.3934C20.8019 21.7839 20.8019 22.4171 21.1924 22.8076L22.6066 21.3934ZM40.9914 42.6066C41.3819 42.9971 42.0151 42.9971 42.4056 42.6066C42.7961 42.2161 42.7961 41.5829 42.4056 41.1924L40.9914 42.6066ZM21.1924 41.1924C20.8019 41.5829 20.8019 42.2161 21.1924 42.6066C21.5829 42.9971 22.2161 42.9971 22.6066 42.6066L21.1924 41.1924ZM42.4056 22.8076C42.7961 22.4171 42.7961 21.7839 42.4056 21.3934C42.0151 21.0029 41.3819 21.0029 40.9914 21.3934L42.4056 22.8076ZM21.1924 22.8076L40.9914 42.6066L42.4056 41.1924L22.6066 21.3934L21.1924 22.8076ZM22.6066 42.6066L42.4056 22.8076L40.9914 21.3934L21.1924 41.1924L22.6066 42.6066Z" fill="black"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <p>Вы уверены, что хотите удалить приходную накладную #${id}?</p>
              <p class="text-secondary">Это действие нельзя отменить.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-cancel" onclick="tables.invoice_in.closeDeleteModal()">Отмена</button>
              <button type="button" class="btn btn-delete" onclick="tables.invoice_in.confirmDelete(${id})">Удалить</button>
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
    await this.deleteInvoiceIn(id)
  }

  closeModal() {
    document.getElementById('modalContainer').innerHTML = ''
  }

  renderModal() {
    const title = this.editId
      ? 'Редактировать приходную накладную'
      : 'Новая приходная накладная'

    const modalHtml = `
      <div class="modal show" style="display: block; background: rgba(0,0,0,0.7);">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${title}</h5>
              <button type="button" class="btn-close" onclick="tables.invoice_in.closeModal()">
                <svg width="128" height="128" viewBox="0 0 64 64" stroke="#9ca3af" stroke-width="3px" xmlns="http://www.w3.org/2000/svg"><path d="M22.6066 21.3934C22.2161 21.0029 21.5829 21.0029 21.1924 21.3934C20.8019 21.7839 20.8019 22.4171 21.1924 22.8076L22.6066 21.3934ZM40.9914 42.6066C41.3819 42.9971 42.0151 42.9971 42.4056 42.6066C42.7961 42.2161 42.7961 41.5829 42.4056 41.1924L40.9914 42.6066ZM21.1924 41.1924C20.8019 41.5829 20.8019 42.2161 21.1924 42.6066C21.5829 42.9971 22.2161 42.9971 22.6066 42.6066L21.1924 41.1924ZM42.4056 22.8076C42.7961 22.4171 42.7961 21.7839 42.4056 21.3934C42.0151 21.0029 41.3819 21.0029 40.9914 21.3934L42.4056 22.8076ZM21.1924 22.8076L40.9914 42.6066L42.4056 41.1924L22.6066 21.3934L21.1924 22.8076ZM22.6066 42.6066L42.4056 22.8076L40.9914 21.3934L21.1924 41.1924L22.6066 42.6066Z" fill="black"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <form id="invoiceInForm" onsubmit="tables.invoice_in.saveForm(event)">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Номер накладной</label>
                    <input type="text" name="invoice_number" class="form-control" value="${this.formData.invoice_number || ''}" placeholder="INV-IN-...">
                    <span class="text-secondary">Например: INV-IN-001</span>
                  </div>
                  
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Дата</label>
                    <input type="datetime-local" name="invoice_date" class="form-control" value="${this.formatDateTimeForInput(this.formData.invoice_date)}">
                  </div>
                  
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Товар <span class="text-danger">*</span></label>
                    <input type="text" id="productSearchInput" class="form-control" placeholder="Введите название товара для поиска..." autocomplete="off" oninput="tables.invoice_in.filterProducts(this.value)" value="${this.getProductNameForInput(this.formData.product_id)}">
                    <input type="hidden" name="product_id" id="selectedProductId" value="${this.formData.product_id || ''}">
                    <div id="productDropdown" class="product-dropdown" style="display: none; position: absolute; background: #1f2937; border: 1px solid #4b5563; border-radius: 6px; max-height: 200px; overflow-y: auto; z-index: 1000; min-width: 250px;"></div>
                    <span class="text-secondary">Начните вводить название товара</span>
                  </div>
                  
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Количество <span class="text-danger">*</span></label>
                    <input type="number" name="quantity" class="form-control" value="${this.formData.quantity || 1}" min="1" required>
                  </div>
                  
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Цена закупки <span class="text-danger">*</span></label>
                    <input type="number" name="purchase_price" class="form-control" value="${this.formData.purchase_price || ''}" step="0.01" min="0" required>
                    <span class="text-secondary">₽ за единицу</span>
                  </div>
                  
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Поставщик</label>
                    <input type="text" name="supplier" class="form-control" value="${this.formData.supplier || ''}" placeholder="ООО Поставщик">
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-cancel" onclick="tables.invoice_in.closeModal()">Отмена</button>
              <button type="submit" class="btn btn-save" form="invoiceInForm">Сохранить</button>
            </div>
          </div>
        </div>
      </div>
    `
    document.getElementById('modalContainer').innerHTML = modalHtml

    setTimeout(() => {
      const handleClickOutside = (e) => {
        const productDropdown = document.getElementById('productDropdown')
        const productInput = document.getElementById('productSearchInput')

        if (
          productDropdown &&
          productInput &&
          !productInput.contains(e.target) &&
          !productDropdown.contains(e.target)
        ) {
          productDropdown.style.display = 'none'
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

    const hiddenProductId = document.getElementById('selectedProductId')?.value
    if (hiddenProductId && !data.product_id) {
      data.product_id = hiddenProductId
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
      await this.updateInvoiceIn(this.editId, data)
    } else {
      await this.createInvoiceIn(data)
    }
  }

  // ========== ФОРМАТИРОВАНИЕ ЯЧЕЕК ТАБЛИЦЫ ==========
  formatCellValue(column, value) {
    if (value === null || value === undefined)
      return '<span class="text-secondary">—</span>'

    if (column === 'product_id') return this.getProductName(value)
    if (column === 'invoice_date' || column === 'created_at')
      return this.formatDateTime(value)
    if (column === 'purchase_price') return Number(value).toFixed(2) + ' ₽'
    if (column === 'quantity') return String(value)

    return String(value)
  }

  renderRow(row, columns) {
    return `
    <tr>
      ${columns
        .map((col) => {
          if (col === 'purchase_price') {
            return `<td>${Number(row.purchase_price || 0).toFixed(2)} ₽</td>`
          }
          return `<td>${this.formatCellValue(col, row[col])}</td>`
        })
        .join('')}
      <td class="text-end">
        <button class="btn btn-edit" onclick="tables.invoice_in.openEditForm(${row.invoice_in_id})">Изменить</button>
        <button class="btn btn-delete" onclick="tables.invoice_in.showDeleteModal(${row.invoice_in_id})">Удалить</button>
      </td>
    </tr>
  `
  }

  // ========== ОСНОВНОЙ RENDER ==========
  render(options = {}) {
    const { onSearch, onPageChange } = options

    if (!this.data.rows || this.data.rows.length === 0) {
      return this.renderEmptyState('Приходные накладные')
    }

    const columnNames = this.getColumnNames()
    const columns = (this.data && this.data.columns) || Object.keys(columnNames)
    const displayRows = [...this.data.rows]
    while (displayRows.length < this.perPage) displayRows.push(null)

    return `
      <div class="table-card">
        <div class="table-header">
          <div class="table-header-left">
            <h2>Приходные накладные</h2>
            <span class="text-secondary">Всего: ${this.data.total}</span>
          </div>
          <div class="table-header-right">
            ${this.renderSearch(onSearch, this.currentSearch)}
            <button class="btn btn-primary" onclick="tables.invoice_in.openCreateForm()">+ Добавить</button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                ${columns.map((col) => `<th style="text-align: left;">${columnNames[col] || col}</th>`).join('')}
                <th style="text-align: right;">Действия</th>
              </tr>
            </thead>
            <tbody>
              ${displayRows
                .map((row) => {
                  if (!row) {
                    return `</tr>${columns.map(() => '<td>&nbsp;</td>').join('')}<td>&nbsp;</td></tr>`
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

// ========== РЕГИСТРАЦИЯ ТАБЛИЦЫ ==========
if (!window.tables) window.tables = {}
window.tables.invoice_in = new InvoiceInTable()
