import { BaseTable } from './BaseTable.js';
import { Toast } from '../../services/Toast.js';
import { Session } from '../../services/Session.js';

export class UserTable extends BaseTable {
  constructor() {
    super();
    this.editId = null;
    this.formData = {};
    this.rowHeight = 53;
    this.tableContainer = null;
  }

  getTableName() {
    return 'user';
  }

  getColumnNames() {
    return {
      idUser: 'ID',
      username: 'Логин',
      email: 'Email',
      phone: 'Телефон',
      reg_date: 'Дата регистрации',
      role: 'Роль',
      first_name: 'Имя',
      last_name: 'Фамилия',
      middle_name: 'Отчество',
      is_active: 'Активен'
    };
  }

  async handleSearch(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('searchInput');
    this.currentSearch = input ? input.value : '';
    this.currentPage = 1;
    await this.load(this.currentPage, this.currentSearch);
    const { renderTable } = await import('../TableContainer.js');
    await renderTable('user', 'tableContainer', {
      onEdit: (table, id) => console.log('Edit', table, id),
      onDelete: (table, id) => console.log('Delete', table, id)
    });
  }

  async handleSearchClear() {
    this.currentSearch = '';
    this.currentPage = 1;
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    await this.load(this.currentPage, this.currentSearch);
    const { renderTable } = await import('../TableContainer.js');
    await renderTable('user', 'tableContainer', {
      onEdit: (table, id) => console.log('Edit', table, id),
      onDelete: (table, id) => console.log('Delete', table, id)
    });
  }

  async load(page = 1, search = '') {
    this.currentPage = page;
    this.currentSearch = search;
    await this.loadData('user', page, search);
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

  async changePage(page) {
    this.currentPage = page;
    await this.load(this.currentPage, this.currentSearch);
    const { renderTable } = await import('../TableContainer.js');
    await renderTable('user', 'tableContainer', {
      onEdit: (table, id) => console.log('Edit', table, id),
      onDelete: (table, id) => console.log('Delete', table, id)
    });
  }

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

  validateForm(data) {
    const errors = [];
    if (!data.username?.trim()) errors.push('Логин обязателен');
    if (!data.email?.trim()) {
      errors.push('Email обязателен');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Неверный формат email');
    }
    if (data.phone && !/^[\+\d\s\-\(\)]{10,}$/.test(data.phone)) {
      errors.push('Неверный формат телефона');
    }
    if (!data.first_name?.trim()) errors.push('Имя обязательно');
    if (!data.last_name?.trim()) errors.push('Фамилия обязательна');
    if (!this.editId && !data.password_hash?.trim()) errors.push('Пароль обязателен');
    return errors;
  }

  async createUser(data) {
    try {
      const result = await window.go.main.App.CreateUser(data);
      if (result.success) {
        this.closeModal();
        await this.load(this.currentPage, this.currentSearch);
        Toast.success('Пользователь успешно создан');
        const { renderTable } = await import('../TableContainer.js');
        await renderTable('user', 'tableContainer', {
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

  async updateUser(id, data) {
    try {
      const result = await window.go.main.App.UpdateUser(id, data);
      if (result.success) {
        this.closeModal();
        await this.load(this.currentPage, this.currentSearch);
        Toast.success('Пользователь успешно обновлён');
        const { renderTable } = await import('../TableContainer.js');
        await renderTable('user', 'tableContainer', {
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

  async deleteUser(id) {
    try {
      const result = await window.go.main.App.DeleteUser(id);
      if (result.success) {
        await this.load(this.currentPage, this.currentSearch);
        Toast.success('Пользователь успешно удалён');
        const { renderTable } = await import('../TableContainer.js');
        await renderTable('user', 'tableContainer', {
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

  openCreateForm() {
    this.editId = null;
    this.formData = {};
    this.renderModal();
  }

  async openEditForm(id) {
    this.editId = id;
    const data = await this.loadUserData(id);
    if (data) {
      this.formData = data;
      this.renderModal();
    }
  }

  async loadUserData(id) {
    try {
      return await window.go.main.App.GetUser(id);
    } catch (error) {
      Toast.error('Ошибка загрузки данных пользователя: ' + error.message);
      return null;
    }
  }

  showDeleteModal(id) {
    const currentUserId = Session.getUserId();
    if (currentUserId == id) {
      Toast.error('Вы не можете удалить свой собственный аккаунт!');
      return;
    }

    const user = this.data.rows?.find(row => row.idUser == id);
    const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : `#${id}`;

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
              <button type="button" class="btn-close" onclick="tables.user.closeDeleteModal()"><svg width="128" height="128" viewBox="0 0 64 64" stroke="#9ca3af" stroke-width="3px" xmlns="http://www.w3.org/2000/svg"><path d="M22.6066 21.3934C22.2161 21.0029 21.5829 21.0029 21.1924 21.3934C20.8019 21.7839 20.8019 22.4171 21.1924 22.8076L22.6066 21.3934ZM40.9914 42.6066C41.3819 42.9971 42.0151 42.9971 42.4056 42.6066C42.7961 42.2161 42.7961 41.5829 42.4056 41.1924L40.9914 42.6066ZM21.1924 41.1924C20.8019 41.5829 20.8019 42.2161 21.1924 42.6066C21.5829 42.9971 22.2161 42.9971 22.6066 42.6066L21.1924 41.1924ZM42.4056 22.8076C42.7961 22.4171 42.7961 21.7839 42.4056 21.3934C42.0151 21.0029 41.3819 21.0029 40.9914 21.3934L42.4056 22.8076ZM21.1924 22.8076L40.9914 42.6066L42.4056 41.1924L22.6066 21.3934L21.1924 22.8076ZM22.6066 42.6066L42.4056 22.8076L40.9914 21.3934L21.1924 41.1924L22.6066 42.6066Z" fill="black"/></svg></button>
            </div>
            <div class="modal-body">
              <p>Вы уверены, что хотите удалить пользователя <strong>${userName}</strong>?</p>
              <p class="text-secondary">Это действие нельзя отменить.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-cancel" onclick="tables.user.closeDeleteModal()">Отмена</button>
              <button type="button" class="btn btn-delete" onclick="tables.user.confirmDelete(${id})">Удалить</button>
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
    await this.deleteUser(id);
  }

  closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
  }

  renderModal() {
    const title = this.editId ? 'Редактировать пользователя' : 'Новый пользователь';

    const passwordField = this.editId ? `
      <div class="col-md-6 mb-3">
        <label class="form-label">Новый пароль</label>
        <input type="password" name="password_hash" class="form-control" placeholder="Оставьте пустым, чтобы не менять">
        <span class="text-secondary">Оставьте пустым, чтобы не менять пароль</span>
      </div>
    ` : `
      <div class="col-md-6 mb-3">
        <label class="form-label">Пароль <span class="text-danger">*</span></label>
        <input type="password" name="password_hash" class="form-control" required>
      </div>
    `;

    const modalHtml = `
      <div class="modal show" style="display: block; background: rgba(0,0,0,0.7);">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${title}</h5>
              <button type="button" class="btn-close" onclick="tables.user.closeModal()">
                <svg width="128" height="128" viewBox="0 0 64 64" stroke="#9ca3af" stroke-width="3px" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.6066 21.3934C22.2161 21.0029 21.5829 21.0029 21.1924 21.3934C20.8019 21.7839 20.8019 22.4171 21.1924 22.8076L22.6066 21.3934ZM40.9914 42.6066C41.3819 42.9971 42.0151 42.9971 42.4056 42.6066C42.7961 42.2161 42.7961 41.5829 42.4056 41.1924L40.9914 42.6066ZM21.1924 41.1924C20.8019 41.5829 20.8019 42.2161 21.1924 42.6066C21.5829 42.9971 22.2161 42.9971 22.6066 42.6066L21.1924 41.1924ZM42.4056 22.8076C42.7961 22.4171 42.7961 21.7839 42.4056 21.3934C42.0151 21.0029 41.3819 21.0029 40.9914 21.3934L42.4056 22.8076ZM21.1924 22.8076L40.9914 42.6066L42.4056 41.1924L22.6066 21.3934L21.1924 22.8076ZM22.6066 42.6066L42.4056 22.8076L40.9914 21.3934L21.1924 41.1924L22.6066 42.6066Z"/>
                </svg>
              </button> 
            </div>
            <div class="modal-body">
              <form id="userForm" onsubmit="tables.user.saveForm(event)">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Логин <span class="text-danger">*</span></label>
                    <input type="text" name="username" class="form-control" value="${this.formData.username || ''}" required>
                  </div>
                  ${passwordField}
                  
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Email <span class="text-danger">*</span></label>
                    <input type="email" name="email" class="form-control" value="${this.formData.email || ''}" required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Телефон</label>
                    <input type="text" name="phone" class="form-control" value="${this.formData.phone || ''}" placeholder="+7 (999) 123-45-67">
                  </div>
                  
                  <div class="col-md-4 mb-3">
                    <label class="form-label">Имя <span class="text-danger">*</span></label>
                    <input type="text" name="first_name" class="form-control" value="${this.formData.first_name || ''}" required>
                  </div>
                  <div class="col-md-4 mb-3">
                    <label class="form-label">Фамилия <span class="text-danger">*</span></label>
                    <input type="text" name="last_name" class="form-control" value="${this.formData.last_name || ''}" required>
                  </div>
                  <div class="col-md-4 mb-3">
                    <label class="form-label">Отчество</label>
                    <input type="text" name="middle_name" class="form-control" value="${this.formData.middle_name || ''}">
                  </div>
                  
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Дата регистрации</label>
                    <input type="datetime-local" name="reg_date" class="form-control" 
                           value="${this.formatDateTimeForInput(this.formData.reg_date)}">
                  </div>
                  
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Роль</label>
                    <select name="role" class="form-select">
                      <option value="Customer" ${this.formData.role === 'Customer' ? 'selected' : ''}>Покупатель</option>
                      <option value="Employee" ${this.formData.role === 'Employee' ? 'selected' : ''}>Сотрудник</option>
                      <option value="Administrator" ${this.formData.role === 'Administrator' ? 'selected' : ''}>Администратор</option>
                    </select>
                  </div>
                  
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Активен</label>
                    <select name="is_active" class="form-select">
                      <option value="1" ${this.formData.is_active == 1 ? 'selected' : ''}>Да</option>
                      <option value="0" ${this.formData.is_active == 0 ? 'selected' : ''}>Нет</option>
                    </select>
                  </div>
                  
                  <input type="hidden" name="idUser" value="${this.formData.idUser || ''}">
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-cancel" onclick="tables.user.closeModal()">Отмена</button>
              <button type="submit" class="btn btn-save" form="userForm">Сохранить</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHtml;
  }

  async saveForm(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (this.editId && (!data.password_hash?.trim())) {
      delete data.password_hash;
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
      await this.updateUser(this.editId, data);
    } else {
      await this.createUser(data);
    }
  }

  formatCellValue(column, value) {
    if (value === null || value === undefined) return '<span class="text-secondary">—</span>';
    if (column === 'reg_date' && value) {
      return this.formatDateTime(value);
    }
    if (column === 'is_active') return value ? 'Да' : 'Нет';
    if (column === 'role') {
      const roles = { Customer: 'Покупатель', Employee: 'Сотрудник', Administrator: 'Администратор' };
      return roles[value] || value;
    }
    return String(value);
  }

  renderRow(row, visibleColumns) {
    const currentUserId = Session.getUserId();
    const isSelf = currentUserId && currentUserId == row.idUser;

    return `
      <tr>
        ${visibleColumns.map(col => `<td>${this.formatCellValue(col, row[col])}</td>`).join('')}
        <td class="text-end">
          <button class="btn btn-edit" onclick="tables.user.openEditForm(${row.idUser})">Изменить</button>
          ${isSelf
        ? `<button class="btn btn-secondary" disabled>Удалить</button>`
        : `<button class="btn btn-delete" onclick="tables.user.showDeleteModal(${row.idUser})">Удалить</button>`
    }
        </td>
      </tr>
    `;
  }

  render(options = {}) {
    const { onSearch, onPageChange } = options;

    if (!this.data.rows || this.data.rows.length === 0) {
      return this.renderEmptyState('Пользователи');
    }

    const columnNames = this.getColumnNames();
    const columns = (this.data && this.data.columns) || Object.keys(columnNames);
    const visibleColumns = columns.filter(col => col !== 'password_hash');
    const displayRows = [...this.data.rows];
    while (displayRows.length < this.perPage) displayRows.push(null);

    return `
      <div class="table-card">
        <div class="table-header">
          <div class="table-header-left">
            <h2>Пользователи</h2>
            <span class="text-secondary">Всего: ${this.data.total}</span>
          </div>
          <div class="table-header-right">
            ${this.renderSearch(onSearch, this.currentSearch)}
            <button class="btn btn-primary" onclick="tables.user.openCreateForm()">+ Добавить</button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                ${visibleColumns.map(col => `<th>${columnNames[col] || col}</th>`).join('')}
                <th class="text-end">Действия</th>
              </tr>
            </thead>
            <tbody>
              ${displayRows.map(row => {
      if (!row) {
        return `<tr>${visibleColumns.map(() => '<td>&nbsp;</td>').join('')}<td>&nbsp;</td></tr>`;
      }
      return this.renderRow(row, visibleColumns);
    }).join('')}
            </tbody>
          </table>
        </div>
        ${this.renderPagination(onPageChange)}
      </div>
    `;
  }
}

if (!window.tables) window.tables = {};
window.tables.user = new UserTable();