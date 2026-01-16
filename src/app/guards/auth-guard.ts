import { Injectable, inject } from '@angular/core';
import {
  CanActivateFn,
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree,
} from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthFacade } from 'src/app/store/auth/auth.facade';

@Injectable({
  providedIn: 'root',
})
export class AuthGuardClass {
  constructor(private authFacade: AuthFacade, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.authFacade.auth$.pipe(
      take(1),
      map((auth) => {

        if (auth) {
          return true;
        }

        // Not authenticated or not authorized
        return this.router.createUrlTree(['/login']);
      })
    );
  }
}

export const AuthGuard: CanActivateFn = (
  next: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean | UrlTree> => {
  return inject(AuthGuardClass).canActivate(next, state);
};
