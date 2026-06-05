import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Location } from '@angular/common';

type Section = 'general' | 'account' | 'privacy' | 'language';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private readonly location = inject(Location);

  readonly activeSection = signal<Section>('general');
  setSection(s: Section): void {
    this.activeSection.set(s);
  }
  goBack(): void {
    this.location.back();
  }

  // ── Général — notifications in-app ──────────────────────────────────────
  readonly notifInvitation = signal(true);
  readonly notifConfirmation = signal(true);
  readonly notifWaitlist = signal(true);
  readonly notifReminder = signal(true);
  readonly notifMessage = signal(true);
  readonly notifCooptation = signal(true);

  // ── Général — notifications email ────────────────────────────────────────
  readonly emailInvitation = signal(true);
  readonly emailConfirmation = signal(true);
  readonly emailWaitlist = signal(true);
  readonly emailReminder = signal(true);
  readonly emailCooptation = signal(true);

  // ── Confidentialité ───────────────────────────────────────────────────────
  readonly profileVisibility = signal<'public' | 'friends'>('public');
  readonly friendRequestsOpen = signal<'everyone' | 'nobody'>('everyone');
  readonly showOnlineStatus = signal(true);
  readonly participateInVotes = signal(true);

  // ── Langue ────────────────────────────────────────────────────────────────
  readonly language = signal('fr');
  readonly dateFormat = signal('dd/mm/yyyy');
  readonly timezone = signal('Europe/Paris');

  onLanguage(e: Event): void {
    this.language.set((e.target as HTMLSelectElement).value);
  }
  onDateFormat(e: Event): void {
    this.dateFormat.set((e.target as HTMLSelectElement).value);
  }
  onTimezone(e: Event): void {
    this.timezone.set((e.target as HTMLSelectElement).value);
  }

  // ── Compte — mot de passe ────────────────────────────────────────────────
  readonly currentPwd = signal('');
  readonly newPwd = signal('');
  readonly confirmPwd = signal('');
  readonly pwdSaved = signal(false);
  readonly pwdError = signal('');

  onCurrentPwd(e: Event): void {
    this.currentPwd.set((e.target as HTMLInputElement).value);
  }
  onNewPwd(e: Event): void {
    this.newPwd.set((e.target as HTMLInputElement).value);
  }
  onConfirmPwd(e: Event): void {
    this.confirmPwd.set((e.target as HTMLInputElement).value);
  }

  savePassword(): void {
    this.pwdError.set('');
    if (!this.currentPwd()) {
      this.pwdError.set('Veuillez saisir votre mot de passe actuel.');
      return;
    }
    if (this.newPwd().length < 8) {
      this.pwdError.set('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (this.newPwd() !== this.confirmPwd()) {
      this.pwdError.set('Les mots de passe ne correspondent pas.');
      return;
    }
    // TODO: appel API PATCH /api/v1/auth/password
    this.pwdSaved.set(true);
    this.currentPwd.set('');
    this.newPwd.set('');
    this.confirmPwd.set('');
  }

  // ── Compte — suppression ─────────────────────────────────────────────────
  readonly showDeleteConfirm = signal(false);
  readonly deleteConfirmText = signal('');
  onDeleteText(e: Event): void {
    this.deleteConfirmText.set((e.target as HTMLInputElement).value);
  }

  requestDeletion(): void {
    // TODO: appel API DELETE /api/v1/users/me
    alert('Demande de suppression envoyée. Un administrateur vous contactera.');
    this.showDeleteConfirm.set(false);
  }
}
