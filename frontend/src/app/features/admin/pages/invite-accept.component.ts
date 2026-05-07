import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '@env/environment';
import { InvitesApiService } from '../services/invites-api.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-invite-accept',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="wrap" [attr.data-api-url]="envApi">
      <mat-card class="card">
        <mat-card-header>
          <mat-card-title>Accept invitation</mat-card-title>
          <mat-card-subtitle>Create your account to join the organization</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (!token()) {
            <p class="error-msg">This invite link is missing a token. Request a new invite.</p>
          } @else {
            <form [formGroup]="form" (ngSubmit)="submit()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Full name</mat-label>
                <input matInput formControlName="fullName" autocomplete="name" />
                @if (form.get('fullName')?.hasError('required')) {
                  <mat-error>Required</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Password</mat-label>
                <input matInput type="password" formControlName="password" autocomplete="new-password" />
                @if (form.get('password')?.hasError('required')) {
                  <mat-error>Required</mat-error>
                }
                @if (form.get('password')?.hasError('minlength')) {
                  <mat-error>At least 8 characters</mat-error>
                }
              </mat-form-field>

              @if (submitError()) {
                <p class="error-msg">{{ submitError() }}</p>
              }

              <button mat-raised-button color="primary" class="full-width" type="submit" [disabled]="form.invalid || loading()">
                @if (loading()) {
                  <mat-spinner diameter="22"></mat-spinner>
                } @else {
                  Create account
                }
              </button>
            </form>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .wrap {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px;
      background: var(--bg-primary);
    }
    .card {
      width: 100%;
      max-width: 420px;
      padding: 8px 8px 16px;
    }
    .full-width { width: 100%; }
    mat-form-field { margin-bottom: 8px; }
    mat-card-header { margin-bottom: 16px; }
    .error-msg {
      color: var(--mat-warn-color, #f44336);
      font-size: 14px;
      margin: 0 0 12px;
    }
    button mat-spinner { display: inline-block; vertical-align: middle; }
  `],
})
export class InviteAcceptComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private invitesApi = inject(InvitesApiService);
  private notify = inject(NotificationService);

  readonly token = signal<string | null>(null);
  readonly loading = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly envApi = environment.apiUrl;

  form: FormGroup = this.fb.group({
    fullName: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.token.set(params.get('token'));
    });
  }

  submit(): void {
    const t = this.token();
    if (!t || this.form.invalid) return;
    this.loading.set(true);
    this.submitError.set(null);
    this.invitesApi
      .accept({
        token: t,
        fullName: this.form.value.fullName,
        password: this.form.value.password,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.notify.success('Invitation accepted. Please sign in.');
          setTimeout(() => this.router.navigate(['/login']), 400);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err.error?.detail || err.error?.message || 'Could not accept invite';
          this.submitError.set(msg);
        },
      });
  }
}
