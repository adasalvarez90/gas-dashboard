import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

// Models
import { Auth } from './auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private baseUrl = environment.gasUrl;

  constructor(private http: HttpClient) {}

  // 🔐 LOGIN → GAS
  public login(username: string, password: string): Observable<Auth> {
    const url = `${this.baseUrl}?action=login`;

    console.log('AuthService.login', { url, username, password });

    return this.http.post<any>(url, { username, password }).pipe(
      map(res => {
        if (!res.authorized) {
          throw new Error(res.error || 'Unauthorized');
        }

        const auth: Auth = {
          user: res.user   // { email, role, name, etc }
        };

        return auth;
      })
    );
  }

  // 🚪 LOGOUT (opcional, solo limpia estado)
  public logout(): Observable<Auth> {
    const url = `${this.baseUrl}?action=logout`;

    return this.http.get<any>(url).pipe(
      map(() => {
        return {
          user: null
        } as Auth;
      })
    );
  }

  // 🔄 CHECK SESSION (opcional)
  public check(): Observable<Auth> {
    const url = `${this.baseUrl}?action=checkAccess`;

    return this.http.get<any>(url).pipe(
      map(res => {
        if (!res.authorized) {
          throw new Error('Unauthorized');
        }

        return {
          user: res.user
        } as Auth;
      })
    );
  }
}
