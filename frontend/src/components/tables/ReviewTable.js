import { BaseTable } from './BaseTable.js';
import { Toast } from '../../services/Toast.js';

export class ReviewTable extends BaseTable {
  constructor() {
    super();
    this.editId = null;
    this.formData = {};
    this.rowHeight = 53;
    this.users = [];
    this.products = [];
    this.data = { columns: [], rows: [], total: 0 };
  }

  getTableName() {
    return 'review';
  }

  getColumnNames() {
    return {
      review_id: 'ID',
      product_id: 'Товар',
      user_id: 'Пользователь',
      rating: 'Рейтинг',
      comment: 'Комментарий',
      advantages: 'Достоинства',
      disadvantages: 'Недостатки',
      is_approved: 'Одобрен',
      created_at: 'Дата создания'
    };
  }

  // ========== ЗАГРУЗКА ДАННЫХ ==========
  async load(page = 1, search = '') {
    this.currentPage = page;
    this.currentSearch = search;
    await this.loadData('review', page, search);
    await this.loadUsers();
    await this.loadProducts();
  }

  async loadData(table, page, search) {
    try {
      const result = await window.go.main.App.GetTableData(table, page, search, this.perPage);
      this.data = result;
      return result;
    } catch (error) {
      Toast.error('Ошибка загрузки данных: ' + error.message);
      this.data = { columns: [], rows: [], total: 0 };
      throw error;
    }
  }

  async loadUsers() {
    try {
      const result = await window.go.main.App.GetTableData('user', 1, '', 1000);
      this.users = result.rows || [];
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      this.users = [];
    }
  }

  async loadProducts() {
    try {
      const result = await window.go.main.App.GetTableData('product', 1, '', 1000);
      this.products = result.rows || [];
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
      this.products = [];
    }
  }

  async changePage(page) {
    this.currentPage = page;
    await this.load(this.currentPage, this.currentSearch);
    const { renderTable } = await import('../TableContainer.js');
    await renderTable('review', 'tableContainer', {
      onEdit: (table, id) => console.log('Edit', table, id),
      onDelete: (table, id) => console.log('Delete', table, id)
    });
  }

  // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
  getUserName(userId) {
    if (!userId) return '<span class="text-secondary">—</span>';
    const user = this.users.find(u => u.idUser == userId);
    if (user) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || String(userId);
    }
    return String(userId);
  }

  getProductName(productId) {
    if (!productId) return '<span class="text-secondary">—</span>';
    const product = this.products.find(p => p.product_id == productId);
    if (product) {
      return product.name || String(productId);
    }
    return String(productId);
  }

  getUserNameForInput(userId) {
    if (!userId) return '';
    const user = this.users.find(u => u.idUser == userId);
    if (user) {
      return `${user.first_name || ''} ${user.last_name || ''} (${user.username || ''})`.trim();
    }
    return '';
  }

  getProductNameForInput(productId) {
    if (!productId) return '';
    const product = this.products.find(p => p.product_id == productId);
    if (product) {
      return product.name;
    }
    return '';
  }

  // ========== ПОИСК В МОДАЛКЕ (ПОЛЬЗОВАТЕЛИ) ==========
  filterUsers(searchText) {
    const dropdown = document.getElementById('userDropdown');
    if (!dropdown) return;

    if (!searchText || searchText.trim() === '') {
      dropdown.style.display = 'none';
      return;
    }

    const searchLower = searchText.toLowerCase();
    const filtered = this.users.filter(user => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''} ${user.username || ''}`.toLowerCase();
      return fullName.includes(searchLower);
    });

    if (filtered.length === 0) {
      dropdown.innerHTML = '<div class="p-2 text-secondary" style="padding: 8px 12px;">Ничего не найдено</div>';
      dropdown.style.display = 'block';
      return;
    }

    dropdown.innerHTML = filtered.map(user => {
      const displayText = `${user.first_name || ''} ${user.last_name || ''} (${user.username || ''})`.trim();
      const escapedText = displayText.replace(/'/g, "\\'").replace(/"/g, '&quot;');
      return `
        <div class="user-dropdown-item" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #374151;" onclick="tables.review.selectUser(${user.idUser}, '${escapedText}')">
          ${displayText}
          <small style="color: #9ca3af; display: block; font-size: 0.75rem;">ID: ${user.idUser}</small>
        </div>
      `;
    }).join('');

    dropdown.style.display = 'block';

    const input = document.getElementById('userSearchInput');
    if (input) {
      const rect = input.getBoundingClientRect();
      dropdown.style.position = 'absolute';
      dropdown.style.top = `${rect.bottom + window.scrollY}px`;
      dropdown.style.left = `${rect.left + window.scrollX}px`;
      dropdown.style.width = `${rect.width}px`;
    }

    dropdown.querySelectorAll('.user-dropdown-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#374151';
      });
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
      });
    });
  }

  selectUser(userId, displayName) {
    const input = document.getElementById('userSearchInput');
    const hiddenInput = document.getElementById('selectedUserId');
    const dropdown = document.getElementById('userDropdown');

    if (input) input.value = displayName;
    if (hiddenInput) hiddenInput.value = userId;
    if (dropdown) dropdown.style.display = 'none';
  }

  // ========== ПОИСК В МОДАЛКЕ (ТОВАРЫ) ==========
  filterProducts(searchText) {
    const dropdown = document.getElementById('productDropdown');
    if (!dropdown) return;

    if (!searchText || searchText.trim() === '') {
      dropdown.style.display = 'none';
      return;
    }

    const searchLower = searchText.toLowerCase();
    const filtered = this.products.filter(product => {
      const productName = (product.name || '').toLowerCase();
      const productId = String(product.product_id || '');
      return productName.includes(searchLower) || productId.includes(searchLower);
    });

    if (filtered.length === 0) {
      dropdown.innerHTML = '<div class="p-2 text-secondary" style="padding: 8px 12px;">Ничего не найдено</div>';
      dropdown.style.display = 'block';
      return;
    }

    dropdown.innerHTML = filtered.map(product => {
      const displayText = product.name || `Товар #${product.product_id}`;
      const escapedText = displayText.replace(/'/g, "\\'").replace(/"/g, '&quot;');
      return `
        <div class="product-dropdown-item" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #374151;" onclick="tables.review.selectProduct(${product.product_id}, '${escapedText}')">
          ${displayText}
          <small style="color: #9ca3af; display: block; font-size: 0.75rem;">ID: ${product.product_id}</small>
        </div>
      `;
    }).join('');

    dropdown.style.display = 'block';

    const input = document.getElementById('productSearchInput');
    if (input) {
      const rect = input.getBoundingClientRect();
      dropdown.style.position = 'absolute';
      dropdown.style.top = `${rect.bottom + window.scrollY}px`;
      dropdown.style.left = `${rect.left + window.scrollX}px`;
      dropdown.style.width = `${rect.width}px`;
    }

    dropdown.querySelectorAll('.product-dropdown-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#374151';
      });
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
      });
    });
  }

  selectProduct(productId, displayName) {
    const input = document.getElementById('productSearchInput');
    const hiddenInput = document.getElementById('selectedProductId');
    const dropdown = document.getElementById('productDropdown');

    if (input) input.value = displayName;
    if (hiddenInput) hiddenInput.value = productId;
    if (dropdown) dropdown.style.display = 'none';
  }

  // ========== ФУНКЦИИ ДАТЫ ==========
  formatDateTime(dateString) {
    if (!dateString) return '<span class="text-secondary">—</span>';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU') + ' ' +
          date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return String(dateString);
    }
  }

  formatDateTimeForInput(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
      return '';
    }
  }

  // ========== CRUD ОПЕРАЦИИ ==========
  async createReview(data) {
    try {
      const result = await window.go.main.App.CreateReview(data);
      if (result.success) {
        this.closeModal();
        await this.load(this.currentPage, this.currentSearch);
        Toast.success('Отзыв успешно создан');
        const { renderTable } = await import('../TableContainer.js');
        await renderTable('review', 'tableContainer', {
          onEdit: (table, id) => console.log('Edit', table, id),
          onDelete: (table, id) => console.log('Delete', table, id)
        });
      } else {
        Toast.error(result.message);
      }
    } catch (error) {
      Toast.error('Ошибка: ' + error.message);
    }
  }

  async updateReview(id, data) {
    try {
      const result = await window.go.main.App.UpdateReview(id, data);
      if (result.success) {
        this.closeModal();
        await this.load(this.currentPage, this.currentSearch);
        Toast.success('Отзыв успешно обновлён');
        const { renderTable } = await import('../TableContainer.js');
        await renderTable('review', 'tableContainer', {
          onEdit: (table, id) => console.log('Edit', table, id),
          onDelete: (table, id) => console.log('Delete', table, id)
        });
      } else {
        Toast.error(result.message);
      }
    } catch (error) {
      Toast.error('Ошибка: ' + error.message);
    }
  }

  async deleteReview(id) {
    try {
      const result = await window.go.main.App.DeleteReview(id);
      if (result.success) {
        await this.load(this.currentPage, this.currentSearch);
        Toast.success('Отзыв успешно удалён');
        const { renderTable } = await import('../TableContainer.js');
        await renderTable('review', 'tableContainer', {
          onEdit: (table, id) => console.log('Edit', table, id),
          onDelete: (table, id) => console.log('Delete', table, id)
        });
      } else {
        Toast.error(result.message);
      }
    } catch (error) {
      Toast.error('Ошибка: ' + error.message);
    }
  }

  // ========== ФУНКЦИИ ВАЛИДАЦИИ ==========
  validateForm(data) {
    const errors = [];
    if (!data.product_id || data.product_id === '') {
      errors.push('Товар обязателен');
    }
    if (!data.user_id || data.user_id === '') {
      errors.push('Пользователь обязателен');
    }
    if (!data.rating || data.rating < 1 || data.rating > 5) {
      errors.push('Рейтинг должен быть от 1 до 5');
    }
    return errors;
  }

  // ========== МОДАЛЬНЫЕ ОКНА ==========
  openCreateForm() {
    this.editId = null;
    this.formData = {};
    this.renderModal();
  }

  async openEditForm(id) {
    this.editId = id;
    const data = await this.loadReviewData(id);
    if (data) {
      this.formData = data;
      this.renderModal();
    }
  }

  async loadReviewData(id) {
    try {
      const data = await window.go.main.App.GetReview(id);
      return data;
    } catch (error) {
      Toast.error('Ошибка загрузки данных отзыва: ' + error.message);
      return null;
    }
  }

  showDeleteModal(id) {
    let modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modalContainer';
      document.body.appendChild(modalContainer);
    }

    const modalHtml = `
      <div class="modal show" style="display: block; background: rgba(0,0,0,0.7);">
        <div class="modal-dialog" style="max-width: 400px;">
          <div class="modal-content">
            <div class="modal-header" style="border-bottom-color: #ef4444;">
              <h5 class="modal-title text-danger">Подтверждение удаления</h5>
              <button type="button" class="btn-close" onclick="tables.review.closeDeleteModal()">
                <svg width="128" height="128" viewBox="0 0 64 64" stroke="#9ca3af" stroke-width="3px" xmlns="http://www.w3.org/2000/svg"><path d="M22.6066 21.3934C22.2161 21.0029 21.5829 21.0029 21.1924 21.3934C20.8019 21.7839 20.8019 22.4171 21.1924 22.8076L22.6066 21.3934ZM40.9914 42.6066C41.3819 42.9971 42.0151 42.9971 42.4056 42.6066C42.7961 42.2161 42.7961 41.5829 42.4056 41.1924L40.9914 42.6066ZM21.1924 41.1924C20.8019 41.5829 20.8019 42.2161 21.1924 42.6066C21.5829 42.9971 22.2161 42.9971 22.6066 42.6066L21.1924 41.1924ZM42.4056 22.8076C42.7961 22.4171 42.7961 21.7839 42.4056 21.3934C42.0151 21.0029 41.3819 21.0029 40.9914 21.3934L42.4056 22.8076ZM21.1924 22.8076L40.9914 42.6066L42.4056 41.1924L22.6066 21.3934L21.1924 22.8076ZM22.6066 42.6066L42.4056 22.8076L40.9914 21.3934L21.1924 41.1924L22.6066 42.6066Z" fill="black"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <p>Вы уверены, что хотите удалить отзыв #${id}?</p>
              <p class="text-secondary">Это действие нельзя отменить.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-cancel" onclick="tables.review.closeDeleteModal()">Отмена</button>
              <button type="button" class="btn btn-delete" onclick="tables.review.confirmDelete(${id})">Удалить</button>
            </div>
          </div>
        </div>
      </div>
    `;

    modalContainer.innerHTML = modalHtml;
  }

  closeDeleteModal() {
    document.getElementById('modalContainer').innerHTML = '';
  }

  async confirmDelete(id) {
    this.closeDeleteModal();
    await this.deleteReview(id);
  }

  closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
  }

  renderModal() {
    const title = this.editId ? 'Редактировать отзыв' : 'Новый отзыв';

    const ratingOptions = [
      { value: 5, label: '5 - Отлично' },
      { value: 4, label: '4 - Хорошо' },
      { value: 3, label: '3 - Средне' },
      { value: 2, label: '2 - Плохо' },
      { value: 1, label: '1 - Ужасно' }
    ];

    const modalHtml = `
      <div class="modal show" style="display: block; background: rgba(0,0,0,0.7);">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${title}</h5>
              <button type="button" class="btn-close" onclick="tables.review.closeModal()">
                <svg width="128" height="128" viewBox="0 0 64 64" stroke="#9ca3af" stroke-width="3px" xmlns="http://www.w3.org/2000/svg"><path d="M22.6066 21.3934C22.2161 21.0029 21.5829 21.0029 21.1924 21.3934C20.8019 21.7839 20.8019 22.4171 21.1924 22.8076L22.6066 21.3934ZM40.9914 42.6066C41.3819 42.9971 42.0151 42.9971 42.4056 42.6066C42.7961 42.2161 42.7961 41.5829 42.4056 41.1924L40.9914 42.6066ZM21.1924 41.1924C20.8019 41.5829 20.8019 42.2161 21.1924 42.6066C21.5829 42.9971 22.2161 42.9971 22.6066 42.6066L21.1924 41.1924ZM42.4056 22.8076C42.7961 22.4171 42.7961 21.7839 42.4056 21.3934C42.0151 21.0029 41.3819 21.0029 40.9914 21.3934L42.4056 22.8076ZM21.1924 22.8076L40.9914 42.6066L42.4056 41.1924L22.6066 21.3934L21.1924 22.8076ZM22.6066 42.6066L42.4056 22.8076L40.9914 21.3934L21.1924 41.1924L22.6066 42.6066Z" fill="black"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <form id="reviewForm" onsubmit="tables.review.saveForm(event)">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Товар <span class="text-danger">*</span></label>
                    <input type="text" id="productSearchInput" class="form-control" placeholder="Введите название товара для поиска..." autocomplete="off" oninput="tables.review.filterProducts(this.value)" value="${this.getProductNameForInput(this.formData.product_id)}">
                    <input type="hidden" name="product_id" id="selectedProductId" value="${this.formData.product_id || ''}">
                    <div id="productDropdown" class="product-dropdown" style="display: none; position: absolute; background: #1f2937; border: 1px solid #4b5563; border-radius: 6px; max-height: 200px; overflow-y: auto; z-index: 1000; min-width: 250px;"></div>
                    <span class="text-secondary">Начните вводить название товара</span>
                  </div>
                  
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Пользователь <span class="text-danger">*</span></label>
                    <input type="text" id="userSearchInput" class="form-control" placeholder="Введите имя, фамилию или логин для поиска..." autocomplete="off" oninput="tables.review.filterUsers(this.value)" value="${this.getUserNameForInput(this.formData.user_id)}">
                    <input type="hidden" name="user_id" id="selectedUserId" value="${this.formData.user_id || ''}">
                    <div id="userDropdown" class="user-dropdown" style="display: none; position: absolute; background: #1f2937; border: 1px solid #4b5563; border-radius: 6px; max-height: 200px; overflow-y: auto; z-index: 1000; min-width: 200px;"></div>
                    <span class="text-secondary">Начните вводить имя, фамилию или логин</span>
                  </div>
                  
                  <div class="col-md-4 mb-3">
                    <label class="form-label">Рейтинг <span class="text-danger">*</span></label>
                    <select name="rating" class="form-select" required>
                      <option value="">— Выберите рейтинг —</option>
                      ${ratingOptions.map(opt => `<option value="${opt.value}" ${this.formData.rating == opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
                    </select>
                  </div>
                  
                  <div class="col-md-4 mb-3">
                    <label class="form-label">Одобрен</label>
                    <select name="is_approved" class="form-select">
                      <option value="0" ${this.formData.is_approved == 0 ? 'selected' : ''}>Нет</option>
                      <option value="1" ${this.formData.is_approved == 1 ? 'selected' : ''}>Да</option>
                    </select>
                  </div>
                  
                  <div class="col-md-4 mb-3">
                    <label class="form-label">Дата создания</label>
                    <input type="datetime-local" name="created_at" class="form-control" value="${this.formatDateTimeForInput(this.formData.created_at)}">
                    <span class="text-secondary">Оставьте пустым для автоматической установки</span>
                  </div>
                  
                  <div class="col-12 mb-3">
                    <label class="form-label">Комментарий</label>
                    <textarea name="comment" class="form-control" rows="3" placeholder="Напишите отзыв...">${this.formData.comment || ''}</textarea>
                  </div>
                  
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Достоинства</label>
                    <textarea name="advantages" class="form-control" rows="2" placeholder="Что понравилось?">${this.formData.advantages || ''}</textarea>
                  </div>
                  
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Недостатки</label>
                    <textarea name="disadvantages" class="form-control" rows="2" placeholder="Что не понравилось?">${this.formData.disadvantages || ''}</textarea>
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-cancel" onclick="tables.review.closeModal()">Отмена</button>
              <button type="submit" class="btn btn-save" form="reviewForm">Сохранить</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.getElementById('modalContainer').innerHTML = modalHtml;

    setTimeout(() => {
      const handleClickOutside = (e) => {
        const userDropdown = document.getElementById('userDropdown');
        const userInput = document.getElementById('userSearchInput');
        const productDropdown = document.getElementById('productDropdown');
        const productInput = document.getElementById('productSearchInput');

        if (userDropdown && userInput && !userInput.contains(e.target) && !userDropdown.contains(e.target)) {
          userDropdown.style.display = 'none';
        }
        if (productDropdown && productInput && !productInput.contains(e.target) && !productDropdown.contains(e.target)) {
          productDropdown.style.display = 'none';
        }
      };
      document.addEventListener('click', handleClickOutside);
    }, 100);
  }

  async saveForm(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const hiddenUserId = document.getElementById('selectedUserId')?.value;
    const hiddenProductId = document.getElementById('selectedProductId')?.value;

    if (hiddenUserId && !data.user_id) {
      data.user_id = hiddenUserId;
    }
    if (hiddenProductId && !data.product_id) {
      data.product_id = hiddenProductId;
    }

    for (let key in data) {
      if (data[key] === '') data[key] = null;
    }

    const errors = this.validateForm(data);
    if (errors.length > 0) {
      Toast.error(errors.join('<br>'));
      return;
    }

    if (this.editId) {
      await this.updateReview(this.editId, data);
    } else {
      await this.createReview(data);
    }
  }

  // ========== ФОРМАТИРОВАНИЕ ЯЧЕЕК ТАБЛИЦЫ ==========
  formatCellValue(column, value) {
    if (value === null || value === undefined) return '<span class="text-secondary">—</span>';

    if (column === 'user_id') return this.getUserName(value);
    if (column === 'product_id') return this.getProductName(value);
    if (column === 'created_at') return this.formatDateTime(value);
    if (column === 'is_approved') return value ? 'Да' : 'Нет';
    if (column === 'rating') return `${value} ★`;

    if (column === 'comment' && value && value.length > 50) {
      return `<span title="${value}">${value.substring(0, 50)}…</span>`;
    }
    if (column === 'advantages' && value && value.length > 30) {
      return `<span title="${value}">${value.substring(0, 30)}…</span>`;
    }
    if (column === 'disadvantages' && value && value.length > 30) {
      return `<span title="${value}">${value.substring(0, 30)}…</span>`;
    }

    return String(value);
  }

  renderRow(row, columns) {
    return `
      <tr>
        ${columns.map(col => `<td>${this.formatCellValue(col, row[col])}</td>`).join('')}
        <td class="text-end">
          <button class="btn btn-edit" onclick="tables.review.openEditForm(${row.review_id})">Изменить</button>
          <button class="btn btn-delete" onclick="tables.review.showDeleteModal(${row.review_id})">Удалить</button>
        </td>
      </tr>
    `;
  }

  // ========== ОСНОВНОЙ RENDER ==========
  render(options = {}) {
    const { onSearch, onPageChange } = options;

    if (!this.data.rows || this.data.rows.length === 0) {
      return this.renderEmptyState('Отзывы');
    }

    const columnNames = this.getColumnNames();
    const columns = (this.data && this.data.columns) || Object.keys(columnNames);
    const displayRows = [...this.data.rows];
    while (displayRows.length < this.perPage) displayRows.push(null);

    return `
      <div class="table-card">
        <div class="table-header">
          <div class="table-header-left">
            <h2>Отзывы</h2>
            <span class="text-secondary">Всего: ${this.data.total}</span>
          </div>
          <div class="table-header-right">
            ${this.renderSearch(onSearch, this.currentSearch)}
            <button class="btn btn-primary" onclick="tables.review.openCreateForm()">+ Добавить</button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                ${columns.map(col => `<th style="text-align: left;">${columnNames[col] || col}</th>`).join('')}
                <th style="text-align: right;">Действия</th>
              </tr>
            </thead>
            <tbody>
              ${displayRows.map(row => {
      if (!row) {
        return `<tr>${columns.map(() => '<td>&nbsp;</td>').join('')}<td>&nbsp;</td></tr>`;
      }
      return this.renderRow(row, columns);
    }).join('')}
            </tbody>
          </table>
        </div>

        ${this.renderPagination(onPageChange)}
      </div>
    `;
  }
}

// ========== РЕГИСТРАЦИЯ ТАБЛИЦЫ ==========
if (!window.tables) window.tables = {};
window.tables.review = new ReviewTable();