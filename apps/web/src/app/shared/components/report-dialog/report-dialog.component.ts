import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { REPORT_REASON_LABELS, type ReportReason } from '../../models';

/**
 * Modale de signalement d'un utilisateur.
 * Contrôlée par le parent via [open]. Émet (closed) et (submitted).
 *
 * Usage :
 *   <mz-report-dialog
 *     [open]="reportOpen()"
 *     [targetName]="targetName()"
 *     (closed)="reportOpen.set(false)"
 *     (submitted)="onReportSubmitted($event)" />
 */
@Component({
  selector: 'mz-report-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <div class="absolute inset-0 bg-black/50" (click)="onClose()" aria-hidden="true"></div>

        <div class="relative z-10 w-full max-w-md mz-card p-6">
          <div class="flex items-start justify-between mb-4">
            <h2 class="font-mz-display font-bold text-lg text-mz-text">
              Signaler {{ targetName() }}
            </h2>
            <button
              type="button"
              (click)="onClose()"
              aria-label="Fermer"
              class="text-mz-text-dim hover:text-mz-text transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p class="text-sm text-mz-text-muted mb-5">
            Un administrateur examinera ce signalement avant toute action.
          </p>

          <fieldset class="flex flex-col gap-2 mb-5">
            <legend class="text-xs font-semibold uppercase tracking-wider text-mz-text-dim mb-2">
              Motif
            </legend>
            @for (r of reasons(); track r.value) {
              <label
                class="flex items-center gap-3 p-3 rounded-mz-btn border cursor-pointer transition-colors"
                [class.border-mz-primary]="selectedReason() === r.value"
                [class.bg-mz-surface-2]="selectedReason() === r.value"
                [class.border-mz-border]="selectedReason() !== r.value"
              >
                <input
                  type="radio"
                  name="report-reason"
                  [value]="r.value"
                  [checked]="selectedReason() === r.value"
                  (change)="selectedReason.set(r.value)"
                  style="accent-color: var(--mz-primary)"
                />
                <span class="text-sm text-mz-text">{{ r.label }}</span>
              </label>
            }
          </fieldset>

          <textarea
            class="mz-input mb-5"
            rows="3"
            placeholder="Détails (optionnel)…"
            (input)="onDetails($event)"
          ></textarea>

          <div class="flex justify-end gap-2">
            <button type="button" class="mz-btn-ghost text-sm" (click)="onClose()">Annuler</button>
            <button
              type="button"
              class="mz-btn-primary text-sm"
              [disabled]="!selectedReason()"
              [class.opacity-50]="!selectedReason()"
              [class.pointer-events-none]="!selectedReason()"
              (click)="onSubmit()"
            >
              Envoyer le signalement
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ReportDialogComponent {
  readonly open = input<boolean>(false);
  readonly targetName = input<string>('cet utilisateur');

  readonly closed = output<void>();
  readonly submitted = output<{ reason: ReportReason; details: string | null }>();

  readonly selectedReason = signal<ReportReason | null>(null);
  readonly details = signal<string>('');

  readonly reasons = computed(() =>
    (Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][]).map(([value, label]) => ({
      value,
      label,
    })),
  );

  onDetails(event: Event): void {
    this.details.set((event.target as HTMLTextAreaElement).value);
  }

  onClose(): void {
    this.reset();
    this.closed.emit();
  }

  onSubmit(): void {
    const reason = this.selectedReason();
    if (!reason) return;
    this.submitted.emit({ reason, details: this.details().trim() || null });
    this.reset();
  }

  private reset(): void {
    this.selectedReason.set(null);
    this.details.set('');
  }
}
