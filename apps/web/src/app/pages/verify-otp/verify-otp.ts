import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputOtpModule } from 'primeng/inputotp';
import { ButtonModule } from 'primeng/button';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { AuthShell } from '../../components/auth-shell/auth-shell';

@Component({
  selector: 'app-verify-otp',
  imports: [FormsModule, InputOtpModule, ButtonModule, RouterLink, AuthShell],
  templateUrl: './verify-otp.html',
  styleUrl: './verify-otp.css',
})
export class VerifyOtp {
  auth = inject(Auth);
  router = inject(Router);
  route = inject(ActivatedRoute);
  cdr = inject(ChangeDetectorRef);

  email = '';
  otp = '';
  verifyFailed = false;
  errorMessage = '';
  loading = false;

  ngOnInit() {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    if (!this.email) {
      this.router.navigate(['/register']);
    }
  }

  onSubmit() {
    if (this.otp.length !== 6) return;
    this.verifyFailed = false;
    this.loading = true;

    this.auth.verifyOtp(this.email, this.otp).subscribe({
      next: () => {
        this.router.navigate(['/home']);
      },
      error: (error: any) => {
        this.verifyFailed = true;
        this.errorMessage = error?.error?.message || 'Code invalide.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
