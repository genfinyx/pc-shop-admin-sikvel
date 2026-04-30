import { BaseTable } from './BaseTable.js';
import { Toast } from '../../services/Toast.js';

export class CategoryTable extends BaseTable {
  constructor() {
    super();
    this.editId = null;
    this.formData = {};
    this.rowHeight = 53;
    this.categories = [];
    this.data = { columns: [], rows: [], total: 0 };
  }

  getTableName() {
    return 'category';
  }

  getColumnNames() {
    return {
      category_id: 'ID',
      name: 'Название',
      description: 'Описание',
      parent_category_id: 'Родительская категория',
      main_image_path: 'Изображение'
    };
  }

  async handleSearch(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('searchInput');
    this.currentSearch = input ? input.value : '';
    this.currentPage = 1;
    await this.load(this.currentPage, this.currentSearch);
    const { renderTable } = await import('../TableContainer.js');
    await renderTable('category', 'tableContainer', {
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
    await renderTable('category', 'tableContainer', {
      onEdit: (table, id) => console.log('Edit', table, id),
      onDelete: (table, id) => console.log('Delete', table, id)
    });
  }

  async load(page = 1, search = '') {
    this.currentPage = page;
    this.currentSearch = search;
    await this.loadData('category', page, search);
    await this.loadCategories();
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

  async loadCategories() {
    try {
      const result = await window.go.main.App.GetCategories();
      this.categories = result || [];
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
      this.categories = [];
    }
  }

  async changePage(page) {
    this.currentPage = page;
    await this.load(this.currentPage, this.currentSearch);
    const { renderTable } = await import('../TableContainer.js');
    await renderTable('category', 'tableContainer', {
      onEdit: (table, id) => console.log('Edit', table, id),
      onDelete: (table, id) => console.log('Delete', table, id)
    });
  }

  getParentCategoryName(parentId) {
    if (!parentId) return '<span class="text-secondary">—</span>';
    const category = this.categories.find(c => c.category_id == parentId);
    return category ? category.name : String(parentId);
  }

  validateForm(data) {
    const errors = [];
    if (!data.name?.trim()) errors.push('Название категории обязательно');
    return errors;
  }

  async createCategory(data) {
    try {
      const result = await window.go.main.App.CreateCategory(data);
      if (result.success) {
        this.closeModal();
        await this.load(this.currentPage, this.currentSearch);
        Toast.success('Категория успешно создана');
        const { renderTable } = await import('../TableContainer.js');
        await renderTable('category', 'tableContainer', {
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

  async updateCategory(id, data) {
    try {
      const result = await window.go.main.App.UpdateCategory(id, data);
      if (result.success) {
        this.closeModal();
        await this.load(this.currentPage, this.currentSearch);
        Toast.success('Категория успешно обновлена');
        const { renderTable } = await import('../TableContainer.js');
        await renderTable('category', 'tableContainer', {
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

  async deleteCategory(id) {
    try {
      const result = await window.go.main.App.DeleteCategory(id);
      if (result.success) {
        await this.load(this.currentPage, this.currentSearch);
        Toast.success('Категория успешно удалена');
        const { renderTable } = await import('../TableContainer.js');
        await renderTable('category', 'tableContainer', {
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
    const data = await this.loadCategoryData(id);
    if (data) {
      this.formData = data;
      this.renderModal();
    }
  }

  async loadCategoryData(id) {
    try {
      return await window.go.main.App.GetCategory(id);
    } catch (error) {
      Toast.error('Ошибка загрузки данных категории: ' + error.message);
      return null;
    }
  }

  showDeleteModal(id) {
    const category = this.data.rows?.find(row => row.category_id == id);
    const categoryName = category?.name || `#${id}`;

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
              <button type="button" class="btn-close" onclick="tables.user.closeModal()">
                <svg width="128" height="128" viewBox="0 0 64 64" stroke="#9ca3af" stroke-width="3px" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.6066 21.3934C22.2161 21.0029 21.5829 21.0029 21.1924 21.3934C20.8019 21.7839 20.8019 22.4171 21.1924 22.8076L22.6066 21.3934ZM40.9914 42.6066C41.3819 42.9971 42.0151 42.9971 42.4056 42.6066C42.7961 42.2161 42.7961 41.5829 42.4056 41.1924L40.9914 42.6066ZM21.1924 41.1924C20.8019 41.5829 20.8019 42.2161 21.1924 42.6066C21.5829 42.9971 22.2161 42.9971 22.6066 42.6066L21.1924 41.1924ZM42.4056 22.8076C42.7961 22.4171 42.7961 21.7839 42.4056 21.3934C42.0151 21.0029 41.3819 21.0029 40.9914 21.3934L42.4056 22.8076ZM21.1924 22.8076L40.9914 42.6066L42.4056 41.1924L22.6066 21.3934L21.1924 22.8076ZM22.6066 42.6066L42.4056 22.8076L40.9914 21.3934L21.1924 41.1924L22.6066 42.6066Z" fill="black"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <p>Вы уверены, что хотите удалить категорию <strong>${categoryName}</strong>?</p>
              <p class="text-secondary">Это действие нельзя отменить.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-cancel" onclick="tables.category.closeDeleteModal()">Отмена</button>
              <button type="button" class="btn btn-delete" onclick="tables.category.confirmDelete(${id})">Удалить</button>
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
    await this.deleteCategory(id);
  }

  closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
  }

  renderModal() {
    const title = this.editId ? 'Редактировать категорию' : 'Новая категория';

    const parentOptions = this.categories
        .filter(cat => this.editId ? cat.category_id != this.editId : true)
        .map(cat => `<option value="${cat.category_id}" ${this.formData.parent_category_id == cat.category_id ? 'selected' : ''}>${cat.name}</option>`)
        .join('');

    const modalHtml = `
      <div class="modal show" style="display: block; background: rgba(0,0,0,0.7);">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${title}</h5>
              <button type="button" class="btn-close" onclick="tables.category.closeModal()"><svg width="128" height="128" viewBox="0 0 64 64" stroke="#9ca3af" stroke-width="3px" xmlns="http://www.w3.org/2000/svg"><path d="M22.6066 21.3934C22.2161 21.0029 21.5829 21.0029 21.1924 21.3934C20.8019 21.7839 20.8019 22.4171 21.1924 22.8076L22.6066 21.3934ZM40.9914 42.6066C41.3819 42.9971 42.0151 42.9971 42.4056 42.6066C42.7961 42.2161 42.7961 41.5829 42.4056 41.1924L40.9914 42.6066ZM21.1924 41.1924C20.8019 41.5829 20.8019 42.2161 21.1924 42.6066C21.5829 42.9971 22.2161 42.9971 22.6066 42.6066L21.1924 41.1924ZM42.4056 22.8076C42.7961 22.4171 42.7961 21.7839 42.4056 21.3934C42.0151 21.0029 41.3819 21.0029 40.9914 21.3934L42.4056 22.8076ZM21.1924 22.8076L40.9914 42.6066L42.4056 41.1924L22.6066 21.3934L21.1924 22.8076ZM22.6066 42.6066L42.4056 22.8076L40.9914 21.3934L21.1924 41.1924L22.6066 42.6066Z" fill="black"/></svg></button>
            </div>
            <div class="modal-body">
              <form id="categoryForm" onsubmit="tables.category.saveForm(event)">
                <div class="row">
                  <div class="col-12 mb-3">
                    <label class="form-label">Название <span class="text-danger">*</span></label>
                    <input type="text" name="name" class="form-control" value="${this.formData.name || ''}" required>
                  </div>
                  <div class="col-12 mb-3">
                    <label class="form-label">Описание</label>
                    <textarea name="description" class="form-control" rows="3">${this.formData.description || ''}</textarea>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Родительская категория</label>
                    <select name="parent_category_id" class="form-select">
                      <option value="">— Нет (корневая категория) —</option>
                      ${parentOptions}
                    </select>
                    <span class="text-secondary">Оставьте пустым, если это корневая категория</span>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Путь к изображению</label>
                    <input type="text" name="main_image_path" class="form-control" value="${this.formData.main_image_path || ''}" placeholder="/img/categories/category_name.jpg">
                    <span class="text-secondary">Пример: /img/categories/processors.jpg</span>
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-cancel" onclick="tables.category.closeModal()">Отмена</button>
              <button type="submit" class="btn btn-save" form="categoryForm">Сохранить</button>
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

    for (let key in data) {
      if (data[key] === '') data[key] = null;
    }

    const errors = this.validateForm(data);
    if (errors.length > 0) {
      Toast.error(errors.join('<br>'));
      return;
    }

    if (this.editId) {
      await this.updateCategory(this.editId, data);
    } else {
      await this.createCategory(data);
    }
  }

  formatCellValue(column, value) {
    if (value === null || value === undefined) return '<span class="text-secondary">—</span>';
    if (column === 'parent_category_id') {
      return this.getParentCategoryName(value);
    }
    if (column === 'main_image_path' && value && value.length > 40) {
      return `<span title="${value}">${value.substring(0, 40)}…</span>`;
    }
    if (column === 'description' && value && value.length > 50) {
      return `<span title="${value}">${value.substring(0, 50)}…</span>`;
    }
    return String(value);
  }

  renderRow(row, columns) {
    return `
      <tr>
        ${columns.map(col => `<td>${this.formatCellValue(col, row[col])}</td>`).join('')}
        <td class="text-end">
          <button class="btn btn-edit" onclick="tables.category.openEditForm(${row.category_id})">Изменить</button>
          <button class="btn btn-delete" onclick="tables.category.showDeleteModal(${row.category_id})">Удалить</button>
        </td>
      </tr>
    `;
  }

  render(options = {}) {
    const { onSearch, onPageChange } = options;

    if (!this.data.rows || this.data.rows.length === 0) {
      return this.renderEmptyState('Категории');
    }

    const columnNames = this.getColumnNames();
    const columns = (this.data && this.data.columns) || Object.keys(columnNames);
    const displayRows = [...this.data.rows];
    while (displayRows.length < this.perPage) displayRows.push(null);

    return `
      <div class="table-card">
        <div class="table-header">
          <div class="table-header-left">
            <h2>Категории</h2>
            <span class="text-secondary">Всего: ${this.data.total}</span>
          </div>
          <div class="table-header-right">
            ${this.renderSearch(onSearch, this.currentSearch)}
            <button class="btn btn-primary" onclick="tables.category.openCreateForm()">+ Добавить</button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                ${columns.map(col => `<th>${columnNames[col] || col}</th>`).join('')}
                <th class="text-end">Действия</th>
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

if (!window.tables) window.tables = {};
window.tables.category = new CategoryTable();