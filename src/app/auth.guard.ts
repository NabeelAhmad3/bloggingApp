import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

export const showLoginModal = new Subject<void>();

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const isLoggedIn = !!localStorage.getItem('authToken');
  
  if (isLoggedIn) {
    return true; 
  } else {
    showLoginModal.next();
    router.navigate(['/blog_posts']);
    return false;
  }
};
