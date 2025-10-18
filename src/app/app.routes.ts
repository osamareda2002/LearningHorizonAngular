import { Routes } from '@angular/router';
import { SplashComponent } from './splash/splash';
import { Login } from './login/login';
import { Register } from './register/register';
import { AdditionalInfo } from './additional-info/additional-info';
import { Home } from './home/home';
import { AuthGuard } from './guards/auth-guard';
import { NoAuthGuard } from './guards/no-auth.guard';
import { Books } from './books/books';
import { ForgotPassword } from './forgot-password/forgot-password';
import { ResetPassword } from './reset-password/reset-password';
import { EmailVerification } from './email-verification/email-verification';
import { Material } from './material/material';
import { CourseVideos } from './course-videos/course-videos';
import { Add } from './add/add';
import { EditDelete } from './edit-delete/edit-delete';

export const routes: Routes = [
  { path: '', component: SplashComponent },
  { path: 'login', component: Login, canActivate: [NoAuthGuard] },
  { path: 'register', component: Register },
  { path: 'email-verification', component: EmailVerification },
  { path: 'additional-info', component: AdditionalInfo },
  { path: 'home', component: Home },
  { path: 'material', component: Material },
  { path: 'course-videos/:id', component: CourseVideos },
  { path: 'add', component: Add, canActivate: [AuthGuard] },
  { path: 'edit-delete', component: EditDelete, canActivate: [AuthGuard] },
  { path: 'books', component: Books },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword },
];
