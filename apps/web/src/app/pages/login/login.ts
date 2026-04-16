  import { Component, inject,ChangeDetectorRef } from '@angular/core';
  import { FormsModule } from '@angular/forms';
  import { InputTextModule } from 'primeng/inputtext';
  import { PasswordModule } from 'primeng/password';
  import { ButtonModule } from 'primeng/button';
  import { RouterLink } from '@angular/router';
  import { Auth } from '../../services/auth';
  import { Router } from '@angular/router';

  @Component({
    selector: 'app-login',
    imports: [FormsModule, InputTextModule, PasswordModule, ButtonModule, RouterLink],
    templateUrl: './login.html',
    styleUrl: './login.css',
  })
  export class Login {
    auth = inject(Auth);
    router = inject(Router);
    cdr = inject(ChangeDetectorRef);

    email = '';
    password = '';
    loginFailed = false

    onSubmit() {
      this.loginFailed = false;
      this.auth.login(this.email, this.password).subscribe({
        next: (response) => {
          this.router.navigate(['/home']);
        },
        error: (error) => {
          this.loginFailed = true;
          this.cdr.detectChanges();
        },
      });
    }
  }
