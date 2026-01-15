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
export class NoAuthGuardClass {
  constructor(private authFacade: AuthFacade, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.authFacade.user$.pipe(
      take(1),
      map((user) => {
        if (!user) {
          return true;
        }

        return this.router.createUrlTree(['/dashboard']);
      })
    );
  }
}

export const NoAuthGuard: CanActivateFn = (
  next: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean | UrlTree> => {
  return inject(NoAuthGuardClass).canActivate(next, state);
};
