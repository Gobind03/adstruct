import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'ms_access_token';
  private readonly REFRESH_KEY = 'ms_refresh_token';

  private _isAuthenticated = signal(this.hasStoredToken());
  private _currentUser = signal<UserInfo | null>(null);

  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();

  constructor(private http: HttpClient, private router: Router) {
    if (this.hasStoredToken()) {
      this.loadCurrentUser();
    }
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, request)
      .pipe(
        tap((response) => {
          localStorage.setItem(this.TOKEN_KEY, response.accessToken);
          localStorage.setItem(this.REFRESH_KEY, response.refreshToken);
          this._isAuthenticated.set(true);
          this.loadCurrentUser();
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    this._isAuthenticated.set(false);
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  refresh(): Observable<LoginResponse> {
    const refreshToken = localStorage.getItem(this.REFRESH_KEY);
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((response) => {
          localStorage.setItem(this.TOKEN_KEY, response.accessToken);
          localStorage.setItem(this.REFRESH_KEY, response.refreshToken);
        })
      );
  }

  private hasStoredToken(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  private loadCurrentUser(): void {
    this.http
      .get<UserInfo>(`${environment.apiUrl}/users/me`)
      .subscribe({
        next: (user) => this._currentUser.set(user),
        error: (err) => {
          if (err?.status === 401 || err?.status === 403) {
            this.logout();
          }
        },
      });
  }
}
