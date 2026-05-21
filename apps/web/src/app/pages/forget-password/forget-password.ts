import { Component, inject, signal, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { AuthShell } from '../../components/auth-shell/auth-shell';

@Component({
  selector: 'app-forget-password',
  imports: [FormsModule, AuthShell],
  templateUrl: './forget-password.html',
  styleUrl: './forget-password.css',
})
export class ForgetPassword implements OnDestroy {
  private auth = inject(Auth);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  email = '';
  emailSent = signal(false);
  loading = signal(false);
  requestFailed = false;
  errorMessage = '';
  resendCooldown = signal(0);

  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  onSubmit() {
    this.requestFailed = false;
    this.errorMessage = '';
    this.loading.set(true);
    this.auth.forgotPassword(this.email).subscribe({
      next: () => {
        this.loading.set(false);
        this.emailSent.set(true);
        this.startResendCooldown();
      },
      error: (error) => {
        this.loading.set(false);
        this.requestFailed = true;
        this.errorMessage = error?.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
        this.cdr.detectChanges();
      },
    });
  }

  resend() {
    if (this.resendCooldown() > 0) return;
    this.auth.forgotPassword(this.email).subscribe({
      next: () => this.startResendCooldown(),
    });
  }

  goBack() {
    this.router.navigate(['/login']);
  }

  private startResendCooldown() {
    this.resendCooldown.set(60);
    this.cooldownInterval = setInterval(() => {
      const current = this.resendCooldown();
      if (current <= 1) {
        this.resendCooldown.set(0);
        clearInterval(this.cooldownInterval!);
        this.cooldownInterval = null;
      } else {
        this.resendCooldown.set(current - 1);
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
  }
}
