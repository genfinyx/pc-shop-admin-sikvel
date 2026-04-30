import { MainPage } from './tables/MainPage.js';
import { UserTable } from './tables/UserTable.js';
import { ProductTable } from "./tables/ProductTable.js";
import { CategoryTable } from "./tables/CategoryTable.js";
import { OrderTable } from './tables/OrderTable.js';
import { OrderItemTable } from './tables/OrderItemTable.js';
import { CartItemTable } from './tables/CartItemTable.js';
import { DeliveryTable } from './tables/DeliveryTable.js';
import { ReviewTable } from './tables/ReviewTable.js';
import { WishlistTable } from './tables/WishlistTable.js';
import { InvoiceInTable } from './tables/InvoiceInTable.js';
import { InvoiceOutTable } from './tables/InvoiceOutTable.js';
import { ReceiptTable } from './tables/ReceiptTable.js';
import { ProductImageTable } from './tables/ProductImageTable.js';

export const tables = {
  main: new MainPage(),
  user: new UserTable(),
  product: new ProductTable(),
  category: new CategoryTable(),
  order: new OrderTable(),
  order_item: new OrderItemTable(),
  cart_item: new CartItemTable(),
  delivery: new DeliveryTable(),
  review: new ReviewTable(),
  wishlist: new WishlistTable(),
  invoice_in: new InvoiceInTable(),
  invoice_out: new InvoiceOutTable(),
  receipt: new ReceiptTable(),
  product_image: new ProductImageTable(),
};

let currentTable = 'main';

export async function renderTable(tableName, containerId, options = {}) {
  console.log('renderTable called:', tableName);

  const table = tables[tableName];
  if (!table) {
    console.error('Table not found:', tableName);
    document.getElementById(containerId).innerHTML = `
      <div class="table-card">
        <div class="alert alert-info">
          Table "${tableName}" is not implemented yet
        </div>
      </div>
    `;
    return;
  }

  // Для MainPage не загружаем данные
  if (tableName !== 'main' && table.load) {
    await table.load(table.currentPage || 1, table.currentSearch || '');
  }

  const html = table.render({
    onSearch: 'window.handleTableSearch',
    onPageChange: 'window.handleTablePageChange',
    onEdit: (id) => {
      if (options.onEdit) options.onEdit(tableName, id);
    },
    onDelete: (id) => {
      if (options.onDelete) options.onDelete(tableName, id);
    }
  });

  document.getElementById(containerId).innerHTML = html;
}

export async function changeTable(tableName, options = {}) {
  console.log('changeTable called:', tableName);
  currentTable = tableName;
  await renderTable(currentTable, 'tableContainer', options);
}

// Делаем tables доступным глобально
window.tables = tables;

// Глобальные обработчики для поиска и пагинации
window.handleTableSearch = async (e) => {
  console.log('handleTableSearch called, currentTable:', currentTable);
  const table = tables[currentTable];
  if (!table) return;

  if (e === null) {
    table.currentSearch = '';
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
  } else {
    e.preventDefault();
    const input = document.getElementById('searchInput');
    table.currentSearch = input ? input.value : '';
  }
  table.currentPage = 1;
  await renderTable(currentTable, 'tableContainer', {
    onEdit: (table, id) => console.log('Edit', table, id),
    onDelete: (table, id) => console.log('Delete', table, id)
  });
};

window.handleTablePageChange = async (page) => {
  console.log('handleTablePageChange called, page:', page);
  const table = tables[currentTable];
  if (!table) return;

  table.currentPage = page;
  await renderTable(currentTable, 'tableContainer', {
    onEdit: (table, id) => console.log('Edit', table, id),
    onDelete: (table, id) => console.log('Delete', table, id)
  });
};