// Система уведомлений (10 секунд, с крестиком)
export const Toast = {
  show(message, type = 'success', duration = 10000) {
    let container = document.getElementById('toastContainer')
    if (!container) {
      container = document.createElement('div')
      container.id = 'toastContainer'
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
      `
      document.body.appendChild(container)
    }

    const bgColor = type === 'success' ? '#059669' : '#dc2626'
    const borderColor = type === 'success' ? '#10b981' : '#ef4444'

    const toast = document.createElement('div')
    toast.style.cssText = `
      background: ${bgColor};
      color: white;
      padding: 14px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(8px);
      border-left: 4px solid ${borderColor};
      animation: slideIn 0.3s ease;
      min-width: 280px;
      max-width: 400px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
    `

    toast.innerHTML = `
      <span>${message}</span>
      <button class="toast-close" style="
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0 5px;
        opacity: 0.7;
        transition: opacity 0.2s;
      " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">&times;</button>
    `

    container.appendChild(toast)

    const closeBtn = toast.querySelector('.toast-close')
    let timeoutId

    const removeToast = () => {
      toast.style.animation = 'slideOut 0.3s ease'
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast)
      }, 300)
      if (timeoutId) clearTimeout(timeoutId)
    }

    closeBtn.onclick = removeToast
    timeoutId = setTimeout(removeToast, duration)
  },

  success(message) {
    this.show(message, 'success')
  },

  error(message) {
    this.show(message, 'error')
  },
}

// Добавляем анимации в head, если их ещё нет
if (!document.querySelector('#toast-animations')) {
  const style = document.createElement('style')
  style.id = 'toast-animations'
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `
  document.head.appendChild(style)
}
