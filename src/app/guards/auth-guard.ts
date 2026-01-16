import { Injectable, inject } from '@angular/core';
import {
  CanActivateFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree,
} from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { Store } from '@ngrx/store';

import {
  selectIsAuthenticated,
  selectAuthLoading,
} from 'src/app/store/auth/auth.selectors';

@Injectable({
  providedIn: 'root',
})
export class AuthGuardClass {
  constructor(private store: Store, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return combineLatest([
      this.store.select(selectIsAuthenticated),
      this.store.select(selectAuthLoading),
    ]).pipe(
      // ⏳ Wait until loading is false
      filter(([_, loading]) => !loading),
      take(1),
      map(([isAuthenticated]) => {
        // ✅ If NOT authenticated → redirect to login
        if (!isAuthenticated) {
          return this.router.createUrlTree(['/login']);
        }

        // ✅ If is authenticated → allow access
        return isAuthenticated;
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
