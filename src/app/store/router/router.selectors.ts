//
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { RouterStateUrl, RouterState } from './router.state';
import { Params } from '@angular/router';
//
export const selectRouter = createFeatureSelector<RouterState>('router');
export const selectRouterState = createSelector(selectRouter, (routerState: RouterState) => routerState.state);
//
export const selectQueryParams = createSelector(selectRouterState, (route: RouterStateUrl) => route.queryParams);
export const selectRouteParams = createSelector(selectRouterState, (route: RouterStateUrl) => route.params);
export const selectRouteData = createSelector(selectRouterState, (route: RouterStateUrl) => route.data);
export const selectUrl = createSelector(selectRouterState, (route: RouterStateUrl) => route.url);
/**
 * GENERAL
 */
export const selectRouterId = createSelector(selectRouteParams, (params: Params) => {

    // Cast the id to a number
    const id = parseInt(params['id'], 10);
    // Validate it's a number
    return isNaN(id) ? 0 : id;
});
