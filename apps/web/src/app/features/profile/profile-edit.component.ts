import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';
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
  private readonly mockData = inject(MockDataService);
  private readonly router = inject(Router);

  readonly bioMax = BIO_MAX;
  private readonly user = this.mockData.currentUser();
  readonly userId = this.user.id;

  readonly name = signal(this.user.name);
  readonly bio = signal(this.user.bio ?? '');
  readonly avatarUrl = signal(this.user.avatarUrl ?? '');
  readonly saved = signal(false);

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
    const reader = new FileReader();
    reader.onload = (e) => {
      this.avatarUrl.set((e.target?.result as string) ?? '');
      this.saved.set(false);
    };
    reader.readAsDataURL(file);
  }

  save(): void {
    this.mockData.updateCurrentUser({
      name: this.name().trim() || this.user.name,
      bio: this.bio().trim() || null,
      avatarUrl: this.avatarUrl() || null,
    });
    this.saved.set(true);
  }

  cancel(): void {
    this.router.navigate(['/profile']);
  }
}
