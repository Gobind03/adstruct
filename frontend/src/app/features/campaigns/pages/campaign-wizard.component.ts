import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { CampaignApiService } from '../services/campaign.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-campaign-wizard',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatStepperModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatDatepickerModule,
    MatNativeDateModule, MatIconModule,
  ],
  template: `
    <h2>Create Campaign</h2>
    <mat-stepper linear #stepper>
      <mat-step [stepControl]="basicsForm" label="Basics">
        <form [formGroup]="basicsForm">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Campaign Name</mat-label>
            <input matInput formControlName="name" />
            <mat-error>Name is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Objective</mat-label>
            <mat-select formControlName="objective">
              <mat-option value="AWARENESS">Awareness</mat-option>
              <mat-option value="CONSIDERATION">Consideration</mat-option>
              <mat-option value="LEAD">Lead Generation</mat-option>
              <mat-option value="PURCHASE">Purchase</mat-option>
              <mat-option value="RETENTION">Retention</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Daily Budget</mat-label>
              <input matInput formControlName="dailyBudget" type="number" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Lifetime Budget</mat-label>
              <input matInput formControlName="lifetimeBudget" type="number" />
            </mat-form-field>
          </div>

          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Start Date</mat-label>
              <input matInput formControlName="startDate" [matDatepicker]="startPicker" />
              <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>End Date</mat-label>
              <input matInput formControlName="endDate" [matDatepicker]="endPicker" />
              <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>
          </div>

          <div class="step-actions">
            <button mat-raised-button color="primary" matStepperNext [disabled]="basicsForm.invalid">
              Next
            </button>
          </div>
        </form>
      </mat-step>

      <mat-step [stepControl]="targetingForm" label="Targeting">
        <form [formGroup]="targetingForm">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Intent Type</mat-label>
            <mat-select formControlName="intentType">
              <mat-option value="LEARN">Learn</mat-option>
              <mat-option value="COMPARE">Compare</mat-option>
              <mat-option value="DECIDE">Decide</mat-option>
              <mat-option value="BUY">Buy</mat-option>
              <mat-option value="SUPPORT">Support</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Topics (JSON)</mat-label>
            <textarea matInput formControlName="topicsJson" rows="3"
                      placeholder='["ai marketing", "chatgpt ads"]'></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Geo Targeting (JSON)</mat-label>
            <textarea matInput formControlName="geoJson" rows="2"
                      placeholder='["US", "UK"]'></textarea>
          </mat-form-field>

          <div class="step-actions">
            <button mat-button matStepperPrevious>Back</button>
            <button mat-raised-button color="primary" matStepperNext [disabled]="targetingForm.invalid">
              Next
            </button>
          </div>
        </form>
      </mat-step>

      <mat-step [stepControl]="unitForm" label="Sponsored Unit">
        <form [formGroup]="unitForm">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Type</mat-label>
            <mat-select formControlName="type">
              <mat-option value="SPONSORED_PLACEMENT">Sponsored Placement</mat-option>
              <mat-option value="SPONSORED_FOLLOWUP_QUESTION">Sponsored Follow-up Question</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Title</mat-label>
            <input matInput formControlName="title" />
            <mat-error>Title is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Snippet</mat-label>
            <textarea matInput formControlName="snippet" rows="3"></textarea>
          </mat-form-field>

          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>CTA Text</mat-label>
              <input matInput formControlName="ctaText" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Landing URL</mat-label>
              <input matInput formControlName="landingUrl" type="url" />
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Disclaimer</mat-label>
            <input matInput formControlName="disclaimer" />
          </mat-form-field>

          <div class="preview-card" *ngIf="unitForm.get('title')?.value">
            <h4>Preview</h4>
            <div class="preview-box">
              <div class="preview-label">Sponsored</div>
              <strong>{{ unitForm.get('title')?.value }}</strong>
              <p>{{ unitForm.get('snippet')?.value }}</p>
              <a class="preview-cta">{{ unitForm.get('ctaText')?.value || 'Learn More' }}</a>
              <small class="preview-disclaimer">{{ unitForm.get('disclaimer')?.value }}</small>
            </div>
          </div>

          <div class="step-actions">
            <button mat-button matStepperPrevious>Back</button>
            <button mat-raised-button color="primary" (click)="onCreate()" [disabled]="unitForm.invalid">
              Create Campaign
            </button>
          </div>
        </form>
      </mat-step>
    </mat-stepper>
  `,
  styles: [`
    h2 {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 20px;
    }
    .full-width { width: 100%; }
    .row { display: flex; gap: 16px; }
    .row mat-form-field { flex: 1; }
    mat-form-field { margin-bottom: 8px; }
    .step-actions { display: flex; gap: 8px; margin-top: 20px; }
    .preview-card {
      margin-top: 20px;
      padding: 20px;
      background: var(--bg-surface-hover);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-default);
    }
    .preview-box {
      padding: 16px;
      background: var(--bg-surface);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-default);
    }
    .preview-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .preview-cta {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
    }
    .preview-disclaimer {
      display: block;
      margin-top: 8px;
      color: var(--text-muted);
      font-size: 11px;
    }
  `],
})
export class CampaignWizardComponent {
  basicsForm: FormGroup;
  targetingForm: FormGroup;
  unitForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private campaignService: CampaignApiService,
    private workspaceService: WorkspaceService,
    private router: Router,
    private notify: NotificationService
  ) {
    this.basicsForm = this.fb.group({
      name: ['', Validators.required],
      objective: ['AWARENESS', Validators.required],
      dailyBudget: [null],
      lifetimeBudget: [null],
      startDate: [null],
      endDate: [null],
    });
    this.targetingForm = this.fb.group({
      intentType: ['LEARN', Validators.required],
      topicsJson: [''],
      geoJson: [''],
    });
    this.unitForm = this.fb.group({
      type: ['SPONSORED_PLACEMENT', Validators.required],
      title: ['', Validators.required],
      snippet: [''],
      ctaText: [''],
      landingUrl: [''],
      disclaimer: [''],
    });
  }

  onCreate(): void {
    const ws = this.workspaceService.currentWorkspace();
    if (!ws) return;

    const campaignReq = {
      workspaceId: ws.id,
      integrationAccountId: '', // Will be set from first available
      ...this.basicsForm.value,
      startDate: this.basicsForm.value.startDate
        ? new Date(this.basicsForm.value.startDate).toISOString().split('T')[0] : null,
      endDate: this.basicsForm.value.endDate
        ? new Date(this.basicsForm.value.endDate).toISOString().split('T')[0] : null,
    };

    this.campaignService.create(campaignReq).subscribe({
      next: (campaign) => {
        this.campaignService.createTargetSet(campaign.id, this.targetingForm.value).subscribe();
        this.campaignService.createSponsoredUnit(campaign.id, this.unitForm.value).subscribe();
        this.notify.success('Campaign created successfully');
        this.router.navigate(['/campaigns', campaign.id]);
      },
      error: (err) => this.notify.error(err.error?.detail || 'Failed to create campaign'),
    });
  }
}
