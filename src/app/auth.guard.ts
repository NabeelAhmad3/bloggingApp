import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const isLoggedIn = !!localStorage.getItem('authToken');
  
  if (isLoggedIn) {
    return true; 
  } else {
    alert('To create post login First')
    router.navigate(['/home']);
    return false;
  }
};
