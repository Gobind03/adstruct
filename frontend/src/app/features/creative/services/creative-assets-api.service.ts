import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  CreativeAssetResponse,
  CreativeAssetVersionResponse,
  FolderResponse,
  PagedResponse,
} from '../models/creative.models';

@Injectable({ providedIn: 'root' })
export class CreativeAssetsApiService {
  constructor(private http: HttpClient) {}

  private base(wsId: string): string {
    return `${environment.apiUrl}/workspaces/${wsId}/creative`;
  }

  listAssets(
    wsId: string,
    params?: { type?: string; status?: string; q?: string; page?: number; size?: number },
  ): Observable<PagedResponse<CreativeAssetResponse>> {
    let httpParams = new HttpParams();
    if (params?.type != null) {
      httpParams = httpParams.set('type', params.type);
    }
    if (params?.status != null) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.q != null) {
      httpParams = httpParams.set('q', params.q);
    }
    if (params?.page != null) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params?.size != null) {
      httpParams = httpParams.set('size', String(params.size));
    }
    return this.http.get<PagedResponse<CreativeAssetResponse>>(`${this.base(wsId)}/assets`, {
      params: httpParams,
    });
  }

  createAsset(wsId: string, body: any): Observable<CreativeAssetResponse> {
    return this.http.post<CreativeAssetResponse>(`${this.base(wsId)}/assets`, body);
  }

  getAsset(wsId: string, assetId: string): Observable<CreativeAssetResponse> {
    return this.http.get<CreativeAssetResponse>(`${this.base(wsId)}/assets/${assetId}`);
  }

  updateAsset(wsId: string, assetId: string, body: any): Observable<CreativeAssetResponse> {
    return this.http.patch<CreativeAssetResponse>(`${this.base(wsId)}/assets/${assetId}`, body);
  }

  archiveAsset(wsId: string, assetId: string): Observable<CreativeAssetResponse> {
    return this.http.post<CreativeAssetResponse>(`${this.base(wsId)}/assets/${assetId}/archive`, {});
  }

  listVersions(wsId: string, assetId: string): Observable<CreativeAssetVersionResponse[]> {
    return this.http.get<CreativeAssetVersionResponse[]>(
      `${this.base(wsId)}/assets/${assetId}/versions`,
    );
  }

  addVersion(wsId: string, assetId: string, body: any): Observable<CreativeAssetVersionResponse> {
    return this.http.post<CreativeAssetVersionResponse>(
      `${this.base(wsId)}/assets/${assetId}/versions`,
      body,
    );
  }

  listFolders(wsId: string): Observable<FolderResponse[]> {
    return this.http.get<FolderResponse[]>(`${this.base(wsId)}/folders`);
  }

  createFolder(
    wsId: string,
    body: { name: string; parentFolderId?: string | null },
  ): Observable<FolderResponse> {
    return this.http.post<FolderResponse>(`${this.base(wsId)}/folders`, body);
  }

  listFolderAssets(wsId: string, folderId: string): Observable<CreativeAssetResponse[]> {
    return this.http.get<CreativeAssetResponse[]>(
      `${this.base(wsId)}/folders/${folderId}/assets`,
    );
  }

  updateFolder(wsId: string, folderId: string, name: string): Observable<FolderResponse> {
    return this.http.patch<FolderResponse>(`${this.base(wsId)}/folders/${folderId}`, { name });
  }

  deleteFolder(wsId: string, folderId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(wsId)}/folders/${folderId}`);
  }

  addAssetToFolder(wsId: string, folderId: string, assetId: string): Observable<void> {
    return this.http.post<void>(`${this.base(wsId)}/folders/${folderId}/assets/${assetId}`, {});
  }

  removeAssetFromFolder(wsId: string, folderId: string, assetId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(wsId)}/folders/${folderId}/assets/${assetId}`);
  }
}
