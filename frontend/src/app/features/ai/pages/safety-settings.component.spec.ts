import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SafetySettingsComponent } from './safety-settings.component';
import { AdminStore } from '../../admin/store/admin.store';

describe('SafetySettingsComponent', () => {
  let component: SafetySettingsComponent;
  let fixture: ComponentFixture<SafetySettingsComponent>;
  let httpMock: HttpTestingController;

  const workspaceId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const orgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SafetySettingsComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    const admin = TestBed.inject(AdminStore);
    admin.selectOrg(orgId);
    admin.selectWorkspace(workspaceId);

    fixture = TestBed.createComponent(SafetySettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock
      .expectOne((req) => req.url === `/api/v1/workspaces/${workspaceId}/ai/safety/policy`)
      .flush({
        id: 'pol-1',
        workspaceId,
        policyJson: '{}',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      });
    httpMock
      .expectOne((req) => req.url === `/api/v1/workspaces/${workspaceId}/ai/safety/redaction-rules`)
      .flush([]);
    httpMock
      .expectOne((req) => req.url === `/api/v1/workspaces/${workspaceId}/ai/tools`)
      .flush([]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have activeTab signal', () => {
    expect(component.activeTab).toBeDefined();
    expect(component.activeTab()).toBe(0);
  });
});
