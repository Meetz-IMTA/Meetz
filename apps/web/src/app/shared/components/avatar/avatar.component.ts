import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Avatar utilisateur, avec pastille "en ligne" optionnelle.
 * Usage : <mz-avatar [src]="user.avatarUrl" [alt]="user.name" [seed]="user.id"
 *                    [size]="48" [online]="user.isOnline ?? false" />
 */
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
      <img
        [src]="resolvedSrc()"
        [alt]="alt()"
        class="w-full h-full rounded-full object-cover border border-mz-border bg-mz-surface-2"
      />
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

  readonly resolvedSrc = computed(() => this.src() ?? `https://i.pravatar.cc/160?u=${this.seed()}`);
  readonly dotSize = computed(() => Math.max(8, Math.round(this.size() / 4)));
}
