import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';
import { routes } from './app.routes';

const MeetzTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fff5f5',
      100: '#ffe3e3',
      200: '#ffc9c9',
      300: '#ffa8a8',
      400: '#ff8787',
      500: '#ff6b6b',
      600: '#fa5252',
      700: '#f03e3e',
      800: '#e03131',
      900: '#c92a2a',
      950: '#a61e1e'
    }
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    providePrimeNG({
      theme: {
        preset: MeetzTheme,
        options: {
          prefix: 'p',
          darkModeSelector: 'system',
        }
      },
      ripple: true
    })
  ]
};
