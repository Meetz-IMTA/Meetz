import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';

const BIO_MAX = 280;

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [RouterLink, AvatarComponent],
  templateUrl: './profile-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileEditComponent {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  readonly bioMax = BIO_MAX;

  readonly name = signal('');
  readonly bio = signal('');
  readonly avatarUrl = signal('');
  readonly bannerUrl = signal('');
  readonly uploadingBanner = signal(false);

  readonly saved = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly saveError = signal('');

  private initialized = false;

  readonly userId = this.userService.currentUser()?.id ?? '';

  constructor() {
    // Initialise les champs quand le profil est disponible
    effect(() => {
      const user = this.userService.currentUser();
      if (user && !this.initialized) {
        this.name.set(user.name);
        this.bio.set(user.bio ?? '');
        this.avatarUrl.set(user.avatarUrl ?? '');
        this.bannerUrl.set(user.bannerUrl ?? '');
        this.initialized = true;
      }
    });
  }

  onName(e: Event): void {
    this.name.set((e.target as HTMLInputElement).value);
    this.saved.set(false);
  }

  onBio(e: Event): void {
    this.bio.set((e.target as HTMLTextAreaElement).value.slice(0, BIO_MAX));
    this.saved.set(false);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Aperçu local immédiat
    const reader = new FileReader();
    reader.onload = (e) => this.avatarUrl.set((e.target?.result as string) ?? '');
    reader.readAsDataURL(file);

    // Upload vers Cloudinary
    this.uploading.set(true);
    this.userService.uploadAvatar(file).subscribe({
      next: (res) => {
        this.avatarUrl.set(res.avatarUrl);
        this.uploading.set(false);
      },
      error: () => {
        this.uploading.set(false);
        this.saveError.set('Échec du téléchargement de la photo.');
      },
    });
  }
  onBannerSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => this.bannerUrl.set((e.target?.result as string) ?? '');
    reader.readAsDataURL(file);
    this.uploadingBanner.set(true);
    this.userService.uploadBanner(file).subscribe({
      next: (res) => {
        this.bannerUrl.set(res.bannerUrl);
        this.uploadingBanner.set(false);
      },
      error: () => {
        this.uploadingBanner.set(false);
        this.saveError.set('Échec du téléchargement de la bannière.');
      },
    });
  }

  save(): void {
    this.saving.set(true);
    this.saveError.set('');

    this.userService
      .updateProfile({
        name: this.name().trim() || undefined,
        bio: this.bio().trim() || null,
      })
      .subscribe({
        next: () => {
          this.saved.set(true);
          this.saving.set(false);
        },
        error: () => {
          this.saving.set(false);
          this.saveError.set('Une erreur est survenue. Réessayez.');
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/profile']);
  }
}
