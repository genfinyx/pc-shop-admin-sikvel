import { BaseTable } from './BaseTable.js'
import { Toast } from '../../services/Toast.js'

export class ProductImageTable extends BaseTable {
  constructor() {
    super()
    this.editId = null
    this.formData = {}
    this.rowHeight = 53
    this.products = []
    this.data = { columns: [], rows: [], total: 0 }
  }

  getTableName() {
    return 'product_image'
  }

  getColumnNames() {
    return {
      image_id: 'ID',
      product_id: 'Товар',
      image_path: 'Путь к изображению',
      sort_order: 'Порядок',
    }
  }

  // ========== ЗАГРУЗКА ДАННЫХ ==========
  async load(page = 1, search = '') {
    this.currentPage = page
    this.currentSearch = search
    await this.loadData('product_image', page, search)
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
    await renderTable('product_image', 'tableContainer', {
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
        <div class="product-dropdown-item" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #374151;" onclick="tables.product_image.selectProduct(${product.product_id}, '${escapedText}')">
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

  // ========== CRUD ОПЕРАЦИИ ==========
  async createProductImage(data) {
    try {
      const result = await window.go.main.App.CreateProductImage(data)
      if (result.success) {
        this.closeModal()
        await this.load(this.currentPage, this.currentSearch)
        Toast.success('Изображение добавлено')
        const { renderTable } = await import('../TableContainer.js')
        await renderTable('product_image', 'tableContainer', {
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

  async updateProductImage(id, data) {
    try {
      const result = await window.go.main.App.UpdateProductImage(id, data)
      if (result.success) {
        this.closeModal()
        await this.load(this.currentPage, this.currentSearch)
        Toast.success('Изображение обновлено')
        const { renderTable } = await import('../TableContainer.js')
        await renderTable('product_image', 'tableContainer', {
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

  async deleteProductImage(id) {
    try {
      const result = await window.go.main.App.DeleteProductImage(id)
      if (result.success) {
        await this.load(this.currentPage, this.currentSearch)
        Toast.success('Изображение удалено')
        const { renderTable } = await import('../TableContainer.js')
        await renderTable('product_image', 'tableContainer', {
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
    if (!data.image_path || data.image_path.trim() === '') {
      errors.push('Путь к изображению обязателен')
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
    const data = await this.loadProductImageData(id)
    if (data) {
      this.formData = data
      this.renderModal()
    }
  }

  async loadProductImageData(id) {
    try {
      const data = await window.go.main.App.GetProductImage(id)
      return data
    } catch (error) {
      Toast.error('Ошибка загрузки данных изображения: ' + error.message)
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
              <button type="button" class="btn-close" onclick="tables.product_image.closeDeleteModal()">
                <svg width="128" height="128" viewBox="0 0 64 64" stroke="#9ca3af" stroke-width="3px" xmlns="http://www.w3.org/2000/svg"><path d="M22.6066 21.3934C22.2161 21.0029 21.5829 21.0029 21.1924 21.3934C20.8019 21.7839 20.8019 22.4171 21.1924 22.8076L22.6066 21.3934ZM40.9914 42.6066C41.3819 42.9971 42.0151 42.9971 42.4056 42.6066C42.7961 42.2161 42.7961 41.5829 42.4056 41.1924L40.9914 42.6066ZM21.1924 41.1924C20.8019 41.5829 20.8019 42.2161 21.1924 42.6066C21.5829 42.9971 22.2161 42.9971 22.6066 42.6066L21.1924 41.1924ZM42.4056 22.8076C42.7961 22.4171 42.7961 21.7839 42.4056 21.3934C42.0151 21.0029 41.3819 21.0029 40.9914 21.3934L42.4056 22.8076ZM21.1924 22.8076L40.9914 42.6066L42.4056 41.1924L22.6066 21.3934L21.1924 22.8076ZM22.6066 42.6066L42.4056 22.8076L40.9914 21.3934L21.1924 41.1924L22.6066 42.6066Z" fill="black"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <p>Вы уверены, что хотите удалить изображение #${id}?</p>
              <p class="text-secondary">Это действие нельзя отменить.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-cancel" onclick="tables.product_image.closeDeleteModal()">Отмена</button>
              <button type="button" class="btn btn-delete" onclick="tables.product_image.confirmDelete(${id})">Удалить</button>
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
    await this.deleteProductImage(id)
  }

  closeModal() {
    document.getElementById('modalContainer').innerHTML = ''
  }

  renderModal() {
    const title = this.editId
      ? 'Редактировать изображение'
      : 'Новое изображение'

    const modalHtml = `
      <div class="modal show" style="display: block; background: rgba(0,0,0,0.7);">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${title}</h5>
              <button type="button" class="btn-close" onclick="tables.product_image.closeModal()">
                <svg width="128" height="128" viewBox="0 0 64 64" stroke="#9ca3af" stroke-width="3px" xmlns="http://www.w3.org/2000/svg"><path d="M22.6066 21.3934C22.2161 21.0029 21.5829 21.0029 21.1924 21.3934C20.8019 21.7839 20.8019 22.4171 21.1924 22.8076L22.6066 21.3934ZM40.9914 42.6066C41.3819 42.9971 42.0151 42.9971 42.4056 42.6066C42.7961 42.2161 42.7961 41.5829 42.4056 41.1924L40.9914 42.6066ZM21.1924 41.1924C20.8019 41.5829 20.8019 42.2161 21.1924 42.6066C21.5829 42.9971 22.2161 42.9971 22.6066 42.6066L21.1924 41.1924ZM42.4056 22.8076C42.7961 22.4171 42.7961 21.7839 42.4056 21.3934C42.0151 21.0029 41.3819 21.0029 40.9914 21.3934L42.4056 22.8076ZM21.1924 22.8076L40.9914 42.6066L42.4056 41.1924L22.6066 21.3934L21.1924 22.8076ZM22.6066 42.6066L42.4056 22.8076L40.9914 21.3934L21.1924 41.1924L22.6066 42.6066Z" fill="black"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <form id="productImageForm" onsubmit="tables.product_image.saveForm(event)">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Товар <span class="text-danger">*</span></label>
                    <input type="text" id="productSearchInput" class="form-control" placeholder="Введите название товара для поиска..." autocomplete="off" oninput="tables.product_image.filterProducts(this.value)" value="${this.getProductNameForInput(this.formData.product_id)}">
                    <input type="hidden" name="product_id" id="selectedProductId" value="${this.formData.product_id || ''}">
                    <div id="productDropdown" class="product-dropdown" style="display: none; position: absolute; background: #1f2937; border: 1px solid #4b5563; border-radius: 6px; max-height: 200px; overflow-y: auto; z-index: 1000; min-width: 250px;"></div>
                    <span class="text-secondary">Начните вводить название товара</span>
                  </div>
                  
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Порядок</label>
                    <input type="number" name="sort_order" class="form-control" value="${this.formData.sort_order || 0}" min="0">
                    <span class="text-secondary">Чем меньше число, тем выше в списке</span>
                  </div>
                  
                  <div class="col-12 mb-3">
                    <label class="form-label">Путь к изображению <span class="text-danger">*</span></label>
                    <input type="text" name="image_path" class="form-control" value="${this.formData.image_path || ''}" placeholder="/img/products/...jpg">
                    <span class="text-secondary">Пример: /img/products/product_name.jpg</span>
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-cancel" onclick="tables.product_image.closeModal()">Отмена</button>
              <button type="submit" class="btn btn-save" form="productImageForm">Сохранить</button>
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
      await this.updateProductImage(this.editId, data)
    } else {
      await this.createProductImage(data)
    }
  }

  // ========== ФОРМАТИРОВАНИЕ ЯЧЕЕК ТАБЛИЦЫ ==========
  formatCellValue(column, value) {
    if (value === null || value === undefined)
      return '<span class="text-secondary">—</span>'

    if (column === 'product_id') return this.getProductName(value)
    if (column === 'image_path' && value && value.length > 50) {
      return `<span title="${value}">${value.substring(0, 50)}…</span>`
    }

    return String(value)
  }

  renderRow(row, columns) {
    return `
      <tr>
        <td>${row.image_id || ''}</td>
        <td>${this.getProductName(row.product_id)}</td>
        <td>${this.formatCellValue('image_path', row.image_path)}</td>
        <td>${row.sort_order || 0}</td>
        <td class="text-end" style="padding: 0.75rem; white-space: nowrap;">
          <button class="btn btn-edit" onclick="tables.product_image.openEditForm(${row.image_id})">Изменить</button>
          <button class="btn btn-delete" onclick="tables.product_image.showDeleteModal(${row.image_id})">Удалить</button>
        </td>
      </td>
    `
  }

  // ========== ОСНОВНОЙ RENDER ==========
  render(options = {}) {
    const { onSearch, onPageChange } = options

    if (!this.data.rows || this.data.rows.length === 0) {
      return this.renderEmptyState('Изображения товаров')
    }

    const columnNames = this.getColumnNames()
    const columns = (this.data && this.data.columns) || Object.keys(columnNames)

    // ВСЕГДА добиваем до 8 строк
    const displayRows = [...this.data.rows]
    while (displayRows.length < this.perPage) {
      displayRows.push(null)
    }

    return `
      <div class="table-card">
        <div class="table-header">
          <div class="table-header-left">
            <h2>Изображения товаров</h2>
            <span class="text-secondary">Всего: ${this.data.total}</span>
          </div>
          <div class="table-header-right">
            ${this.renderSearch(onSearch, this.currentSearch)}
            <button class="btn btn-primary" onclick="tables.product_image.openCreateForm()">+ Добавить</button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th style="text-align: left;">ID</th>
                <th style="text-align: left;">Товар</th>
                <th style="text-align: left;">Путь к изображению</th>
                <th style="text-align: left;">Порядок</th>
                <th style="text-align: right;">Действия</th>
              </tr>
            </thead>
            <tbody>
              ${displayRows
                .map((row) => {
                  if (!row) {
                    return `
                    <tr style="height: ${this.rowHeight}px;">
                      <td style="padding: 0.75rem;">&nbsp;</td>
                      <td style="padding: 0.75rem;">&nbsp;</td>
                      <td style="padding: 0.75rem;">&nbsp;</td>
                      <td style="padding: 0.75rem;">&nbsp;</td>
                      <td style="padding: 0.75rem;">&nbsp;</td>
                    </tr>
                  `
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
window.tables.product_image = new ProductImageTable()
