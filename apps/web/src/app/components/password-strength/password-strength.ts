import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-password-strength',
  imports: [NgClass],
  template: `
    @if (password.length > 0) {
      <div class="space-y-1 px-1">
        <div class="flex gap-1">
          @for (segment of segments; track segment) {
            <div
              class="h-1 flex-1 rounded-full transition-all"
              [ngClass]="segment < strength ? color : 'bg-gray-200'"
            ></div>
          }
        </div>
        <p class="text-xs font-semibold" [ngClass]="textColor">{{ label }}</p>
      </div>
    }
  `,
})
export class PasswordStrength {
  @Input() password = '';

  readonly segments = [0, 1, 2, 3];

  get strength(): number {
    const p = this.password;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  }

  get color(): string {
    if (this.strength <= 1) return 'bg-red-400';
    if (this.strength === 2) return 'bg-amber-400';
    if (this.strength === 3) return 'bg-yellow-400';
    return 'bg-green-500';
  }

  get textColor(): string {
    if (this.strength <= 1) return 'text-red-500';
    if (this.strength === 2) return 'text-amber-500';
    if (this.strength === 3) return 'text-yellow-600';
    return 'text-green-600';
  }

  get label(): string {
    if (this.strength <= 1) return 'Très faible';
    if (this.strength === 2) return 'Faible';
    if (this.strength === 3) return 'Moyen';
    return 'Fort';
  }
}
