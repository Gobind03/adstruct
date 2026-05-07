import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  Organization,
  OrganizationCreateRequest,
  OrganizationUpdateRequest,
} from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class OrgApiService {
  private base = `${environment.apiUrl}/organizations`;

  constructor(private http: HttpClient) {}

  list(): Observable<Organization[]> {
    return this.http.get<Organization[]>(this.base);
  }

  get(orgId: string): Observable<Organization> {
    return this.http.get<Organization>(`${this.base}/${orgId}`);
  }

  create(request: OrganizationCreateRequest): Observable<Organization> {
    return this.http.post<Organization>(this.base, request);
  }

  update(orgId: string, request: OrganizationUpdateRequest): Observable<Organization> {
    return this.http.patch<Organization>(`${this.base}/${orgId}`, request);
  }
}
