import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.sesionValida()) return true;
  auth.cerrarSesionLocal();
  return inject(Router).createUrlTree(['/login']);
};

export const gestorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.esGestor() ? true : inject(Router).createUrlTree(['/horario']);
};
