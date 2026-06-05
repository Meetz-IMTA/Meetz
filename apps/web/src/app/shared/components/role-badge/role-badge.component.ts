import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { UserRole } from '../../models';

/** Pastille indiquant le rôle d'un utilisateur. Usage : <mz-role-badge [role]="user.role" /> */
@Component({
  selector: 'mz-role-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center rounded-mz-pill bg-mz-surface-2
                 text-mz-text-muted text-xs font-semibold px-2.5 py-0.5"
    >
      {{ label() }}
    </span>
  `,
})
export class RoleBadgeComponent {
  readonly role = input<UserRole>('user');

  readonly label = computed(() => {
    const map: Record<UserRole, string> = {
      admin: 'Admin',
      creator: 'Créateur',
      user: 'Membre',
      organizer: 'Organisateur',
    };
    return map[this.role()];
  });
}
