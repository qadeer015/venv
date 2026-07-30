/**
 * Reusable Toast Notification Component
 * 
 * Usage:
 *   showToast('Message text', { type: 'success', duration: 2000, position: 'bottom-end' });
 * 
 * Options:
 *   type     - 'success' | 'danger' | 'warning' | 'info'  (default: 'success')
 *   duration - Time in ms before auto-hide (default: 2000, 0 = no auto-hide)
 *   position - 'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end' (default: 'bottom-end')
 */

function showToast(message, options = {}) {
    const {
        type = 'success',
        duration = 2000,
        position = 'bottom-end'
    } = options;

    const positionMap = {
        'top-start':    { top: '0', left: '0' },
        'top-center':   { top: '0', left: '50%', transform: 'translateX(-50%)' },
        'top-end':      { top: '0', right: '0' },
        'bottom-start': { bottom: '0', left: '0' },
        'bottom-center':{ bottom: '0', left: '50%', transform: 'translateX(-50%)' },
        'bottom-end':   { bottom: '0', right: '0' }
    };

    const posStyle = positionMap[position] || positionMap['bottom-end'];

    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `position: fixed; z-index: 9999; padding: 1rem; pointer-events: none; display: flex; flex-direction: column; gap: 0.5rem; ${Object.entries(posStyle).map(([k, v]) => `${k}: ${v}`).join('; ')}`;
        document.body.appendChild(container);
    } else {
        // Update container position if needed
        Object.entries(posStyle).forEach(([k, v]) => {
            container.style[k] = v;
        });
        container.style.transform = posStyle.transform || '';
    }

    // Create the toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        pointer-events: auto;
        min-width: 250px;
        max-width: 400px;
        padding: 0.75rem 1rem;
        border-radius: 0.375rem;
        color: #fff;
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.3);
        animation: toastSlideIn 0.3s ease-out;
        transition: opacity 0.3s ease-out;
    `;

    // Set background color based on type
    const bgColors = {
        success: '#198754',
        danger:  '#dc3545',
        warning: '#ffc107',
        info:    '#0dcaf0'
    };
    toast.style.backgroundColor = bgColors[type] || bgColors.success;

    // Set icon based on type
    const icons = {
        success: 'bi-check-circle-fill',
        danger:  'bi-exclamation-triangle-fill',
        warning: 'bi-exclamation-circle-fill',
        info:    'bi-info-circle-fill'
    };
    const iconClass = icons[type] || icons.success;

    // Set text color for warning type (dark text on yellow)
    if (type === 'warning') {
        toast.style.color = '#212529';
    }

    toast.innerHTML = `
        <i class="bi ${iconClass}"></i>
        <span style="flex: 1;">${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; font-size: 1.25rem; line-height: 1; opacity: 0.7; margin-left: 0.5rem;">&times;</button>
    `;

    container.appendChild(toast);

    // Auto-hide after duration (if duration > 0)
    if (duration > 0) {
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
                // Remove container if empty
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 300);
        }, duration);
    }
}

// Inject slide-in animation keyframes
(function injectToastStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes toastSlideIn {
            from {
                opacity: 0;
                transform: translateY(1rem);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
})();