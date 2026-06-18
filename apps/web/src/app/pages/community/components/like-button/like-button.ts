import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

@Component({
  selector: 'app-like-button',
  template: `
    <button
      type="button"
      (click)="onClick()"
      [disabled]="disabled"
      class="relative inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors disabled:opacity-60"
      [class.px-3]="!compact"
      [class.py-1.5]="!compact"
      [class.px-2]="compact"
      [class.py-1]="compact"
      [class.bg-rose-50]="liked && !compact"
      [class.bg-transparent]="compact"
      [class.text-rose-600]="liked"
      [class.text-gray-500]="!liked"
      [class.hover:text-rose-600]="!liked"
      [attr.aria-pressed]="liked"
      [attr.title]="liked ? 'Je n’aime plus' : 'J’aime'"
    >
      @if (showBurst()) {
        <span class="mz-like-burst"></span>
      }
      <span
        class="material-symbols-outlined mz-like-icon"
        [class.filled]="liked"
        [class.animate]="showBurst()"
        [style.font-size.px]="compact ? 18 : 20"
        >favorite</span
      >
      <span [class.text-xs]="compact" [class.text-sm]="!compact">{{ count }}</span>
    </button>
  `,
})
export class LikeButton {
  @Input() count = 0;
  @Input() disabled = false;
  @Input() compact = false;
  @Output() toggle = new EventEmitter<void>();

  private _liked = false;
  showBurst = signal(false);

  @Input() set liked(value: boolean) {
    if (value && !this._liked) {
      this.showBurst.set(true);
      setTimeout(() => this.showBurst.set(false), 500);
    }
    this._liked = value;
  }
  get liked(): boolean {
    return this._liked;
  }

  onClick() {
    if (this.disabled) return;
    this.toggle.emit();
  }
}
