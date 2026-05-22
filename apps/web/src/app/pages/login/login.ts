import { Component, inject, ChangeDetectorRef, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { AuthShell } from '../../components/auth-shell/auth-shell';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, AuthShell],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  auth = inject(Auth);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);

  mode = signal<AuthMode>('login');

  // Champs partagés
  email = '';
  password = '';

  // Champs register uniquement
  name = '';
  confirmPassword = '';

  // États d'erreur
  loginFailed = false;
  registerFailed = false;
  passwordMismatch = false;
  errorMessage = '';

  switchMode(newMode: AuthMode) {
    this.mode.set(newMode);
    this.resetErrors();
  }

  private resetErrors() {
    this.loginFailed = false;
    this.registerFailed = false;
    this.passwordMismatch = false;
    this.errorMessage = '';
  }

  onSubmit() {
    this.resetErrors();
    if (this.mode() === 'login') {
      this.onLogin();
    } else {
      this.onRegister();
    }
  }

  private onLogin() {
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/home']),
      error: () => {
        this.loginFailed = true;
        this.errorMessage = 'Email ou mot de passe incorrect.';
        this.cdr.detectChanges();
      },
    });
  }

  private onRegister() {
    if (this.password !== this.confirmPassword) {
      this.passwordMismatch = true;
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      this.cdr.detectChanges();
      return;
    }

    this.auth.register(this.name, this.email, this.password).subscribe({
      next: (res) => {
        if (res.accessToken) {
          this.router.navigate(['/home']);
        } else {
          this.router.navigate(['/verify-otp'], { queryParams: { email: res.email } });
        }
      },
      error: (error) => {
        this.registerFailed = true;
        this.errorMessage = error?.error?.message || 'Une erreur est survenue.';
        this.cdr.detectChanges();
      },
    });
  }

  onGoogleLogin() {
    // TODO: OAuth Google
  }

  onAppleLogin() {
    // TODO: OAuth Apple
  }
}
