import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  AiConversation,
  AiConversationCreateRequest,
  AiConversationWithMessagesResponse,
  AiMessageCreateRequest,
  PostMessageResponse,
} from '../models/ai.models';

@Injectable({ providedIn: 'root' })
export class AiConversationsApiService {
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  private path(wsId: string): string {
    return `${this.base}/workspaces/${wsId}/ai/conversations`;
  }

  list(wsId: string): Observable<AiConversation[]> {
    return this.http.get<AiConversation[]>(this.path(wsId));
  }

  create(wsId: string, body: AiConversationCreateRequest): Observable<AiConversation> {
    return this.http.post<AiConversation>(this.path(wsId), body);
  }

  get(wsId: string, convId: string): Observable<AiConversationWithMessagesResponse> {
    return this.http.get<AiConversationWithMessagesResponse>(`${this.path(wsId)}/${convId}`);
  }

  postMessage(wsId: string, convId: string, body: AiMessageCreateRequest): Observable<PostMessageResponse> {
    return this.http.post<PostMessageResponse>(`${this.path(wsId)}/${convId}/messages`, body);
  }

  archive(wsId: string, convId: string): Observable<void> {
    return this.http.post<void>(`${this.path(wsId)}/${convId}/archive`, {});
  }
}
