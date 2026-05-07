import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ProviderSettingsComponent } from './provider-settings.component';
import { AdminStore } from '../../admin/store/admin.store';
import type { UserProfile } from '../../admin/models/admin.models';

describe('ProviderSettingsComponent', () => {
  let component: ProviderSettingsComponent;
  let fixture: ComponentFixture<ProviderSettingsComponent>;
  let httpMock: HttpTestingController;

  const orgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ProviderSettingsComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    const admin = TestBed.inject(AdminStore);
    const profile: UserProfile = {
      id: 'u1',
      email: 'admin@test.com',
      fullName: 'Admin',
      status: 'ACTIVE',
      memberships: [
        {
          id: 'm1',
          userId: 'u1',
          orgId,
          workspaceId: null,
          role: 'ORG_ADMIN',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    admin.setUserProfile(profile);
    admin.selectOrg(orgId);

    fixture = TestBed.createComponent(ProviderSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const listReq = httpMock.expectOne((req) => req.url === `/api/v1/orgs/${orgId}/ai/providers`);
    listReq.flush([]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have providers signal', () => {
    expect(component.providers).toBeDefined();
    expect(component.providers()).toEqual([]);
  });

  it('should show empty state initially', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Connect your AI providers');
  });
});
