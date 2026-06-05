import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Affiche une note sur 5 sous forme d'étoiles + valeur.
 * Ne rend rien si rating vaut null.
 * Usage : <mz-star-rating [rating]="user.rating" [size]="14" />
 */
@Component({
  selector: 'mz-star-rating',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rating() !== null) {
      <span class="inline-flex items-center gap-1.5" [attr.aria-label]="ariaLabel()">
        <span class="inline-flex gap-0.5 text-mz-primary">
          @for (i of stars(); track i) {
            <svg
              [attr.width]="size()"
              [attr.height]="size()"
              viewBox="0 0 24 24"
              [attr.fill]="i <= rounded() ? 'currentColor' : 'none'"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
              />
            </svg>
          }
        </span>
        <span class="text-xs font-medium text-mz-text-muted">{{ display() }}</span>
      </span>
    }
  `,
})
export class StarRatingComponent {
  readonly rating = input<number | null>(null);
  readonly size = input<number>(14);

  readonly stars = computed(() => [1, 2, 3, 4, 5]);
  readonly rounded = computed(() => Math.round(this.rating() ?? 0));
  readonly display = computed(() => (this.rating() ?? 0).toFixed(1));
  readonly ariaLabel = computed(() => `Note : ${this.display()} sur 5`);
}
