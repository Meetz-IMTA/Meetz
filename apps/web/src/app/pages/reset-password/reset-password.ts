import { Component, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword implements OnInit {
  private auth = inject(Auth);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  private token = '';

  password = '';
  confirmPassword = '';

  loading = signal(false);
  success = signal(false);
  invalidToken = signal(false);
  passwordMismatch = false;
  resetFailed = false;
  errorMessage = '';

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.invalidToken.set(true);
    } else {
      this.token = token;
    }
  }

  passwordStrength = signal(0);

  onPasswordChange() {
    const p = this.password;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    this.passwordStrength.set(score);
  }

  strengthColor(): string {
    const s = this.passwordStrength();
    if (s <= 1) return 'bg-red-400';
    if (s === 2) return 'bg-amber-400';
    if (s === 3) return 'bg-yellow-400';
    return 'bg-green-500';
  }

  strengthTextColor(): string {
    const s = this.passwordStrength();
    if (s <= 1) return 'text-red-500';
    if (s === 2) return 'text-amber-500';
    if (s === 3) return 'text-yellow-600';
    return 'text-green-600';
  }

  strengthLabel(): string {
    const s = this.passwordStrength();
    if (s <= 1) return 'Très faible';
    if (s === 2) return 'Faible';
    if (s === 3) return 'Moyen';
    return 'Fort';
  }

  onSubmit() {
    this.passwordMismatch = false;
    this.resetFailed = false;

    if (this.password !== this.confirmPassword) {
      this.passwordMismatch = true;
      return;
    }

    this.loading.set(true);
    this.auth.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (error) => {
        this.loading.set(false);
        const msg = error?.error?.message || '';
        if (msg.toLowerCase().includes('invalide') || msg.toLowerCase().includes('expiré')) {
          this.invalidToken.set(true);
        } else {
          this.resetFailed = true;
          this.errorMessage = msg || 'Une erreur est survenue.';
          this.cdr.detectChanges();
        }
      },
    });
  }
}
