import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [FormsModule, InputTextModule, PasswordModule, ButtonModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  auth = inject(Auth);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  registerFailed = false;
  errorMessage = '';
  passwordMismatch = false;

  onSubmit() {
    this.registerFailed = false;
    this.passwordMismatch = false;
    this.errorMessage = '';

    if (this.password !== this.confirmPassword) {
      this.passwordMismatch = true;
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
}
