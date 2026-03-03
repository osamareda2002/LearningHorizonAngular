import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { inject } from '@vercel/analytics';

bootstrapApplication(App, {
  providers: [...appConfig.providers, provideHttpClient(withInterceptorsFromDi())],
}).catch((err) => console.error(err));

// Initialize Vercel Web Analytics
inject();
