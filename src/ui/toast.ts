/**
 * Toast notifications and accessible modal dialog helpers.
 * Fully bundled with zero external CDN dependencies.
 */

import { createIcons, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export function showToast(message: string, type: ToastType = 'info'): void {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');

  let iconName = 'info';
  let borderCol = 'border-slate-700';
  let bgCol = 'bg-slate-900';

  if (type === 'success') {
    iconName = 'check-circle-2';
    borderCol = 'border-emerald-500/50';
  } else if (type === 'warning') {
    iconName = 'alert-triangle';
    borderCol = 'border-amber-500/50';
  } else if (type === 'error') {
    iconName = 'x-circle';
    borderCol = 'border-red-500/50';
  }

  toast.className = `pointer-events-auto flex items-center space-x-2.5 px-4 py-3 rounded-xl ${bgCol} text-white border ${borderCol} shadow-2xl text-xs font-medium transition-all duration-300 transform translate-y-2 opacity-0`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 shrink-0 text-brand-400"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  createIcons({
    icons: {
      Info,
      CheckCircle2,
      AlertTriangle,
      XCircle
    },
    root: toast
  });

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export function openConfirmDialog(
  title: string,
  message: string,
  onProceed: () => void
): void {
  const dialog = document.getElementById('confirmDialog');
  const titleEl = document.getElementById('confirmDialogTitle');
  const msgEl = document.getElementById('confirmDialogMessage');
  const proceedBtn = document.getElementById('confirmProceedBtn') as HTMLButtonElement | null;
  const cancelBtn = document.getElementById('confirmCancelBtn') as HTMLButtonElement | null;

  if (!dialog || !titleEl || !msgEl || !proceedBtn || !cancelBtn) return;

  titleEl.innerText = title;
  msgEl.innerText = message;
  dialog.classList.remove('hidden');

  const cleanup = () => {
    dialog.classList.add('hidden');
    proceedBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  proceedBtn.onclick = () => {
    cleanup();
    onProceed();
  };
  cancelBtn.onclick = cleanup;
}

export function openPromptModal(
  title: string,
  initialValue: string,
  onSubmit: (val: string) => void
): void {
  const modal = document.getElementById('promptModal');
  const titleEl = document.getElementById('promptModalTitle');
  const input = document.getElementById('promptModalInput') as HTMLInputElement | null;
  const submitBtn = document.getElementById('promptSubmitBtn') as HTMLButtonElement | null;
  const cancelBtn = document.getElementById('promptCancelBtn') as HTMLButtonElement | null;

  if (!modal || !titleEl || !input || !submitBtn || !cancelBtn) return;

  titleEl.innerText = title;
  input.value = initialValue;
  modal.classList.remove('hidden');
  input.focus();

  const cleanup = () => {
    modal.classList.add('hidden');
    submitBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  submitBtn.onclick = () => {
    const val = input.value.trim();
    if (val) {
      cleanup();
      onSubmit(val);
    }
  };
  cancelBtn.onclick = cleanup;
}
