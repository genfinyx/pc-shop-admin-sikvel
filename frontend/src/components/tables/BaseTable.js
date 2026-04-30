export class BaseTable {
  constructor() {
    this.currentPage = 1;
    this.currentSearch = '';
    this.perPage = 8;
    this.data = { columns: [], rows: [], total: 0 };
  }

  async loadData(table, page, search) {
    const result = await window.go.main.App.GetTableData(table, page, search, this.perPage);
    this.data = result;
    return result;
  }

  getPages() {
    return Math.ceil(this.data.total / this.perPage);
  }

  renderPagination(onPageChange) {
    const totalPages = this.getPages();

    if (totalPages <= 1) {
      return '';
    }

    const pages = [];

    if (totalPages > 10) {
      if (this.currentPage <= 5) {
        for (let i = 1; i <= 9; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
      else if (this.currentPage >= totalPages - 4) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 8; i <= totalPages; i++) pages.push(i);
      }
      else {
        pages.push(1);
        pages.push('...');
        for (let i = this.currentPage - 4; i <= this.currentPage + 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    } else {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    }

    return `
    <nav aria-label="Page navigation" class="mt-3">
      <ul class="pagination pagination-sm justify-content-center">
        ${pages.map(p => {
      if (p === '...') {
        return `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }
      return `
            <li class="page-item ${p === this.currentPage ? 'active' : ''}">
              <a class="page-link" href="#" onclick="(${onPageChange})(${p}); return false;">${p}</a>
            </li>
          `;
    }).join('')}
      </ul>
    </nav>
  `;
  }

  formatValue(value) {
    if (value === null || value === undefined) return '<span class="text-secondary">NULL</span>';
    if (typeof value === 'string' && value.length > 100) return value.substring(0, 100) + '…';
    return String(value);
  }

  // ЕДИНЫЙ renderSearch - c крестиком, без смещений
  renderSearch(onSearch, currentSearch) {
    return `
    <div class="search-wrapper">
      ${currentSearch ? `<a href="#" class="search-clear-left" onclick="${onSearch}(null); return false;">✖</a>` : ''}
      <form class="search-form" onsubmit="${onSearch}(event)">
        <input type="text" class="search-input" placeholder="Поиск..." value="${currentSearch || ''}" id="searchInput">
        <button type="submit" class="btn btn-search">🔍 Поиск</button>
      </form>
    </div>
  `;
  }

  renderEmptyState(title) {
    return `
    <div class="table-card">
      <div class="table-header">
        <div class="table-header-left">
          <h2 class="h5">${title}</h2>
          <span class="text-secondary">Всего: 0</span>
        </div>
        <div class="table-header-right" style="display: flex; gap: 12px; align-items: center;">
          <div class="search-wrapper">
            ${this.currentSearch ? `<a href="#" class="search-clear-left" onclick="window.handleTableSearch(null); return false;">✖</a>` : ''}
            <form class="search-form" onsubmit="window.handleTableSearch(event)">
              <input type="text" class="search-input" placeholder="Поиск..." value="${this.currentSearch || ''}" id="searchInput">
              <button type="submit" class="btn btn-search">🔍 Поиск</button>
            </form>
          </div>
          <button class="btn btn-primary" onclick="tables.${this.getTableName()}.openCreateForm()" style="margin-left: -4px">+ Добавить</button>
        </div>
      </div>
      <div class="empty-state">
        <h3>Ничего не найдено ;(</h3>
      </div>
      ${this.renderPagination('window.handleTablePageChange')}
    </div>
  `;
  }

  getTableName() {
    return 'base';
  }
}