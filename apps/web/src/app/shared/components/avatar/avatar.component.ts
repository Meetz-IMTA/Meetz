import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'mz-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="relative inline-block shrink-0"
      [style.width.px]="size()"
      [style.height.px]="size()"
    >
      @if (src()) {
        <img
          [src]="src()!"
          [alt]="alt()"
          class="w-full h-full rounded-full object-cover border border-mz-border"
        />
      } @else {
        <span
          class="flex items-center justify-center w-full h-full rounded-full bg-mz-surface-2 border border-mz-border text-mz-text-muted font-bold select-none"
          [style.font-size.px]="fontSize()"
          aria-hidden="true"
          >{{ initial() }}</span
        >
      }
      @if (online()) {
        <span
          class="absolute bottom-0 right-0 block rounded-full bg-mz-success border-2 border-mz-bg"
          [style.width.px]="dotSize()"
          [style.height.px]="dotSize()"
          aria-label="En ligne"
        ></span>
      }
    </span>
  `,
})
export class AvatarComponent {
  readonly src = input<string | null>(null);
  readonly alt = input<string>('Avatar');
  readonly size = input<number>(48);
  readonly online = input<boolean>(false);
  readonly seed = input<string>('user');

  readonly initial = computed(() => (this.alt() || this.seed() || '?')[0].toUpperCase());
  readonly dotSize = computed(() => Math.max(8, Math.round(this.size() / 4)));
  readonly fontSize = computed(() => Math.max(10, Math.round(this.size() / 2.5)));
}
