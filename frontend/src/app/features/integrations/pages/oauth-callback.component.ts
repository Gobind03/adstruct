import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="wrap">
      <mat-card>
        <mat-card-content class="content">
          @if (status === 'success') {
            <mat-icon class="ok">check_circle</mat-icon>
            <h2>Connected</h2>
            <p>Your integration account was linked successfully.</p>
            @if (accountId) {
              <p class="muted">Account ID: <code>{{ accountId }}</code></p>
            }
          } @else {
            <mat-icon class="bad">error</mat-icon>
            <h2>Connection failed</h2>
            <p>We could not complete the OAuth flow. You can close this window and try again.</p>
          }
          <div class="actions">
            <button mat-raised-button color="primary" (click)="closeOrGoHome()">
              {{ isPopup ? 'Close' : 'Back to app' }}
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .wrap { min-height: 60vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .content { text-align: center; max-width: 420px; }
    mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 8px; }
    mat-icon.ok { color: #2e7d32; }
    mat-icon.bad { color: #c62828; }
    h2 { margin: 8px 0; font-size: 22px; font-weight: 600; }
    .muted { color: var(--mat-sys-on-surface-variant, rgba(0,0,0,.6)); font-size: 13px; }
    .actions { margin-top: 20px; }
    code { font-size: 12px; word-break: break-all; }
  `],
})
export class OauthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  status: 'success' | 'error' = 'error';
  accountId: string | null = null;
  isPopup = false;

  ngOnInit(): void {
    this.isPopup = window.opener != null && window.opener !== window;
    this.route.queryParamMap.subscribe((q) => {
      const s = (q.get('status') ?? '').toLowerCase();
      this.status = s === 'success' || s === 'ok' ? 'success' : 'error';
      this.accountId = q.get('accountId');
      if (this.status === 'success' && this.isPopup) {
        try {
          window.opener?.postMessage(
            { type: 'integration-oauth', status: 'success', accountId: this.accountId },
            '*'
          );
        } catch {
          /* ignore */
        }
      }
    });
  }

  closeOrGoHome(): void {
    if (this.isPopup) {
      window.close();
      return;
    }
    void this.router.navigate(['/integrations/accounts']);
  }
}
