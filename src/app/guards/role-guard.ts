import { Injectable, inject } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree,
  CanActivateFn
} from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthFacade } from 'src/app/store/auth/auth.facade';

@Injectable({
  providedIn: 'root'
})
export class RoleGuardClass implements CanActivate {

  constructor(
    private authFacade: AuthFacade,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {

    const allowedRoles: number[] = route.data['roles'];

    return this.authFacade.user$.pipe(
      take(1),
      map(user => {

        if (!user) {
          return this.router.createUrlTree(['/login']);
        }

        // If route does not define roles, allow access
        if (!allowedRoles || allowedRoles.length === 0) {
          return true;
        }

        // Check role
        if (allowedRoles.includes(user.role)) {
          return true;
        }

        // Not authorized
        return this.router.createUrlTree(['/forbidden']);
      })
    );
  }
}

export const RoleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  return inject(RoleGuardClass).canActivate(route, state);
};