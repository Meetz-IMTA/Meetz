import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';
import routes from './app.routes';

const MeetzTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fff1f1',
      100: '#ffe0e0',
      200: '#ffc5c5',
      300: '#ff9e9e',
      400: '#ff8080',
      500: '#ff6b6b',
      600: '#e85555',
      700: '#cc3a3a',
      800: '#a82b2b',
      900: '#8a2020',
      950: '#4d0f0f',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          100: '#f8f9fa',
        },
        formField: {
          background: '#ffffff',
          color: '#9ca3af',
          borderColor: '#d1d5db',
          placeholderColor: '#9ca3af',
        },
      },
      dark: {
        formField: {
          background: '#ffffff',
          color: '#9ca3af',
          borderColor: '#d1d5db',
          placeholderColor: '#9ca3af',
        },
      },
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    providePrimeNG({
      theme: {
        preset: MeetzTheme,
        options: {
          prefix: 'p',
          darkModeSelector: 'false',
        },
      },
      ripple: true,
    }),
  ],
};
