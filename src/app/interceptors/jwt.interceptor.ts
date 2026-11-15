import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const esDelBack = req.url.startsWith(environment.apiUrl);
  const peticion = token && esDelBack ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(peticion).pipe(
    catchError(error => {
      const esAuth = req.url.includes('/auth/');
      // El back responde 403 (no 401) cuando el token falta o venció: si el token ya expiró, se cierra la sesión.
      const vencida = error.status === 403 && !!token && !auth.sesionValida();
      if (!esAuth && (error.status === 401 || vencida)) auth.logout();
      return throwError(() => error);
    })
  );
};
