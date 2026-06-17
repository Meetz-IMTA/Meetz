import { Component, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Auth } from '../../services/auth';
import { AuthShell } from '../../components/auth-shell/auth-shell';
import { PasswordStrength } from '../../components/password-strength/password-strength';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink, AuthShell, PasswordStrength],
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

  private passwordStrength(p: string): number {
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  }

  onSubmit() {
    this.passwordMismatch = false;
    this.resetFailed = false;

    if (this.passwordStrength(this.password) < 2) {
      this.resetFailed = true;
      this.errorMessage =
        'Le mot de passe est trop faible. Il doit contenir au moins 8 caractères et inclure une majuscule, un chiffre ou un caractère spécial.';
      this.cdr.detectChanges();
      return;
    }

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
