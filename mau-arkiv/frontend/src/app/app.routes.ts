import { Routes } from '@angular/router';
import { ContentComponent } from './components/content/content-component/content-component';
import { LoginComponent } from './components/login-component/login-component';
import { AccessDeniedComponent } from './components/access-denied/access-denied.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { 
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'access-denied',
        component: AccessDeniedComponent
    },
    { 
        path: '',
        component: ContentComponent,
        canActivate: [authGuard]
    },
    {
        path: 'content/:uid',
        component: ContentComponent,
        canActivate: [authGuard]
    }
];
