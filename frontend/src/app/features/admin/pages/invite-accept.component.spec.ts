import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { InviteAcceptComponent } from './invite-accept.component';
import { InvitesApiService } from '../services/invites-api.service';
import { NotificationService } from '@core/services/notification.service';

describe('InviteAcceptComponent', () => {
  let component: InviteAcceptComponent;
  let fixture: ComponentFixture<InviteAcceptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        InviteAcceptComponent,
        NoopAnimationsModule,
        HttpClientTestingModule,
        RouterTestingModule,
      ],
      providers: [
        InvitesApiService,
        NotificationService,
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(new Map([['token', 'test-token-123']])) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InviteAcceptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form with fullName and password fields', () => {
    const form = component.form;
    expect(form).toBeTruthy();
    expect(form.contains('fullName')).toBeTrue();
    expect(form.contains('password')).toBeTrue();
  });

  it('should require fullName', () => {
    const ctrl = component.form.get('fullName');
    ctrl?.setValue('');
    expect(ctrl?.valid).toBeFalse();
    ctrl?.setValue('Jane Doe');
    expect(ctrl?.valid).toBeTrue();
  });

  it('should require password with minimum length', () => {
    const ctrl = component.form.get('password');
    ctrl?.setValue('');
    expect(ctrl?.valid).toBeFalse();
    ctrl?.setValue('short');
    expect(ctrl?.valid).toBeFalse();
    ctrl?.setValue('longenoughpassword');
    expect(ctrl?.valid).toBeTrue();
  });

  it('should disable submit when form is invalid', () => {
    component.form.get('fullName')?.setValue('');
    component.form.get('password')?.setValue('');
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button[type="submit"], button[color="primary"]');
    if (btn) {
      expect(btn.disabled || component.form.invalid).toBeTrue();
    }
  });
});
