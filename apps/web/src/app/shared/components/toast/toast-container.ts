import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from '../../../services/toast';

@Component({
  selector: 'app-toast-container',
  template: `
    <div class="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          class="mz-toast flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border bg-white"
          [class.border-green-200]="toast.type === 'success'"
          [class.border-red-200]="toast.type === 'error'"
          [class.border-zinc-200]="toast.type === 'info'"
        >
          <span
            class="material-symbols-outlined shrink-0"
            style="font-size: 20px"
            [class.text-green-600]="toast.type === 'success'"
            [class.text-red-600]="toast.type === 'error'"
            [class.text-zinc-500]="toast.type === 'info'"
            >{{ icon(toast.type) }}</span
          >
          <p class="text-sm text-zinc-700 flex-1 leading-snug">{{ toast.message }}</p>
          <button
            type="button"
            (click)="toasts.dismiss(toast.id)"
            class="text-zinc-300 hover:text-zinc-500 transition-colors shrink-0"
          >
            <span class="material-symbols-outlined" style="font-size: 16px">close</span>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainer {
  toasts = inject(ToastService);

  icon(type: ToastType): string {
    return type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
  }
}
