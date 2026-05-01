import '../styles/style.css';
import { Session } from '../services/Session.js';

// Функции для дат
function getDefaultDateStart() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}

function getDefaultDateEnd() {
  return new Date().toISOString().split('T')[0];
}

let currentTab = 'in';
let dateStart = getDefaultDateStart();
let dateEnd = getDefaultDateEnd();
let reportData = { in: [], out: [], receipts: [] };

export function ReportsPage() {
  return `
    <div class="reports-container">
      <!-- НАВБАР -->
      <nav class="navbar navbar-expand-lg navbar-dark sticky-top">
        <div class="container-fluid">
          <a class="navbar-brand" href="#" onclick="window.goToAdmin(); return false;">
            <div class="logo-square">ПК</div>
            <span>Отчёты</span>
          </a>
          <div class="d-flex align-items-center ms-auto">
            <span class="text-secondary small me-3">
              <span class="badge bg-info ms-1">Администратор</span>
            </span>
            <button class="btn btn-sm btn-reports me-2" onclick="window.goToAdmin()">Справочники</button>
            <button class="btn btn-sm btn-logout" onclick="window.logout()">Выйти</button>
          </div>
        </div>
      </nav>

      <!-- КОНТЕНТ ОТЧЁТОВ -->
      <div class="container-fluid py-4">
        <div class="reports-card">
          <h2 class="h4 mb-4">Отчёты</h2>

          <!-- Вкладки -->
          <div class="nav-tabs">
            <button class="nav-link ${currentTab === 'in' ? 'active' : ''}" 
                    onclick="window.changeReportTab('in')">
              Приходные накладные
            </button>
            <button class="nav-link ${currentTab === 'out' ? 'active' : ''}" 
                    onclick="window.changeReportTab('out')">
              Расходные накладные
            </button>
            <button class="nav-link ${currentTab === 'receipts' ? 'active' : ''}" 
                    onclick="window.changeReportTab('receipts')">
              Чеки
            </button>
          </div>

          <!-- Фильтр по датам -->
          <div class="date-filter">
            <div class="date-field">
              <label>С</label>
              <input type="date" class="date-picker" id="dateStart" value="${dateStart}">
            </div>
            <div class="date-field">
              <label>По</label>
              <input type="date" class="date-picker" id="dateEnd" value="${dateEnd}">
            </div>
            <button class="btn-apply" onclick="window.applyDateFilter()">Применить</button>
          </div>

          <!-- Контент вкладок -->
          <div class="tab-content">
            ${renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTabContent() {
  switch(currentTab) {
    case 'in':
      return renderIncomingInvoices();
    case 'out':
      return renderOutgoingInvoices();
    case 'receipts':
      return renderReceipts();
    default:
      return '';
  }
}

function renderIncomingInvoices() {
  const data = reportData.in || [];
  const totalQuantity = data.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalAmount = data.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.purchase_price) || 0)), 0);

  return `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="h5 mb-0">Приходные накладные</h3>
        <button class="btn-excel" onclick="window.downloadExcel('in')">
          Скачать Excel
        </button>
      </div>

      <div class="table-responsive">
        <table class="table table-hover table-dark">
          <thead>
            <tr>
              <th>Дата</th>
              <th>№ накладной</th>
              <th>Товар</th>
              <th>Поставщик</th>
              <th class="text-end">Кол-во</th>
              <th class="text-end">Цена</th>
              <th class="text-end">Сумма</th>
            </tr>
          </thead>
          <tbody>
            ${data.length === 0 ? `
              <tr><td colspan="7" class="text-center text-secondary py-4">Нет данных за выбранный период</td></tr>
            ` : data.map(item => `
              <tr>
                <td>${formatDate(item.invoice_date)}</td>
                <td>${item.invoice_number || ''}</td>
                <td>${item.product_name || ''}</td>
                <td>${item.supplier || ''}</td>
                <td class="text-end">${Number(item.quantity) || 0}</td>
                <td class="text-end">${formatMoney(item.purchase_price)}</td>
                <td class="text-end">${formatMoney((Number(item.quantity) || 0) * (Number(item.purchase_price) || 0))}</td>
              </tr>
            `).join('')}
          </tbody>
          ${data.length > 0 ? `
            <tfoot>
              <tr class="total-row">
                <td colspan="4" class="text-end"><strong>Итого:</strong></td>
                <td class="text-end"><strong>${totalQuantity}</strong></td>
                <td class="text-end"></td>
                <td class="text-end"><strong>${formatMoney(totalAmount)}</strong></td>
              </tr>
            </tfoot>
          ` : ''}
        </table>
      </div>
    </div>
  `;
}

function renderOutgoingInvoices() {
  const data = reportData.out || [];
  const totalQuantity = data.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalAmount = data.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.price) || 0)), 0);

  return `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="h5 mb-0">Расходные накладные</h3>
        <button class="btn-excel" onclick="window.downloadExcel('out')">
          Скачать Excel
        </button>
      </div>

      <div class="table-responsive">
        <table class="table table-hover table-dark">
          <thead>
            <tr>
              <th>Дата</th>
              <th>№ накладной</th>
              <th>№ заказа</th>
              <th>Товар</th>
              <th class="text-end">Кол-во</th>
              <th class="text-end">Цена</th>
              <th class="text-end">Сумма</th>
            </tr>
          </thead>
          <tbody>
            ${data.length === 0 ? `
              <tr><td colspan="7" class="text-center text-secondary py-4">Нет данных за выбранный период</td></tr>
            ` : data.map(item => `
              <tr>
                <td>${formatDate(item.invoice_date)}</td>
                <td>${item.invoice_number || ''}</td>
                <td>${item.order_number || ''}</td>
                <td>${item.product_name || ''}</td>
                <td class="text-end">${Number(item.quantity) || 0}</td>
                <td class="text-end">${formatMoney(item.price)}</td>
                <td class="text-end">${formatMoney((Number(item.quantity) || 0) * (Number(item.price) || 0))}</td>
              </tr>
            `).join('')}
          </tbody>
          ${data.length > 0 ? `
            <tfoot>
              <tr class="total-row">
                <td colspan="4" class="text-end"><strong>Итого:</strong></td>
                <td class="text-end"><strong>${totalQuantity}</strong></td>
                <td class="text-end"></td>
                <td class="text-end"><strong>${formatMoney(totalAmount)}</strong></td>
              </tr>
            </tfoot>
          ` : ''}
        </table>
      </div>
    </div>
  `;
}

function renderReceipts() {
  const data = reportData.receipts || [];
  const totalAmount = data.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);

  return `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="h5 mb-0">Чеки</h3>
      </div>

      <div class="table-responsive">
        <table class="table table-hover table-dark">
          <thead>
            <tr>
              <th>Дата</th>
              <th>№ чека</th>
              <th>№ заказа</th>
              <th>Клиент</th>
              <th class="text-end">Сумма</th>
              <th class="text-center">Действие</th>
            </tr>
          </thead>
          <tbody>
            ${data.length === 0 ? `
              <tr><td colspan="6" class="text-center text-secondary py-4">Нет данных за выбранный период</td></tr>
            ` : data.map(item => `
              <tr>
                <td>${formatDate(item.receipt_date)}</td>
                <td>${item.receipt_number || item.receipt_id}</td>
                <td>${item.order_number || ''}</td>
                <td>${item.customer_name || ''}</td>
                <td class="text-end">${formatMoney(item.total_amount)}</td>
                <td class="text-center">
                  <button class="btn-pdf" onclick="window.printReceipt(${item.receipt_id})">
                    Печать
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
          ${data.length > 0 ? `
            <tfoot>
              <tr class="total-row">
                <td colspan="4" class="text-end"><strong>Итого:</strong></td>
                <td class="text-end"><strong>${formatMoney(totalAmount)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          ` : ''}
        </table>
      </div>
    </div>
  `;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU');
}

function formatMoney(amount) {
  if (amount === undefined || amount === null) return '0.00';
  return Number(amount).toFixed(2) + ' ₽';
}

// ------------------ Глобальные функции экспорта ------------------
window.downloadExcel = async (type) => {
  const startDate = document.getElementById('dateStart').value;
  const endDate = document.getElementById('dateEnd').value;
  if (!startDate || !endDate) {
    alert('Выберите период дат');
    return;
  }
  try {
    const filepath = await window.go.main.App.ExportInvoiceWithTemplate(type, startDate, endDate);
    if (!filepath) {
      alert('Нет данных за выбранный период');
      return;
    }
    const base64 = await window.go.main.App.ReadFileBase64(filepath);
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `report_${type}_${startDate}_to_${endDate}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Ошибка скачивания:', error);
    alert('Ошибка: ' + error.message);
  }
};

window.printReceipt = async (id) => {
  try {
    const filepath = await window.go.main.App.GenerateReceiptPDF(id);
    if (!filepath) {
      alert('Не удалось сгенерировать чек');
      return;
    }
    const base64 = await window.go.main.App.ReadFileBase64(filepath);
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `receipt_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Ошибка печати чека:', error);
    alert('Ошибка: ' + error.message);
  }
};

window.changeReportTab = async (tab) => {
  currentTab = tab;
  await loadReportData();
  document.getElementById('app').innerHTML = ReportsPage();
};

window.applyDateFilter = async () => {
  dateStart = document.getElementById('dateStart').value;
  dateEnd = document.getElementById('dateEnd').value;
  await loadReportData();
  document.getElementById('app').innerHTML = ReportsPage();
};

window.goToAdmin = () => {
  if (window.goToAdminGlobal) window.goToAdminGlobal();
};

window.logout = () => {
  localStorage.setItem('logout', 'true');
  Session.logout();
  window.location.reload();
};

async function loadReportData() {
  try {
    const inData = await window.go.main.App.GetReportData('in', dateStart, dateEnd);
    reportData.in = inData || [];
    const outData = await window.go.main.App.GetReportData('out', dateStart, dateEnd);
    reportData.out = outData || [];
    const receiptsData = await window.go.main.App.GetReportData('receipts', dateStart, dateEnd);
    reportData.receipts = receiptsData || [];
  } catch (error) {
    console.error('Ошибка загрузки отчётов:', error);
  }
}

// Загружаем данные при старте
setTimeout(() => {
  loadReportData();
}, 100);