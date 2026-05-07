import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ProposalsListComponent } from './proposals-list.component';
import { AdminStore } from '../../admin/store/admin.store';

describe('ProposalsListComponent', () => {
  let component: ProposalsListComponent;
  let fixture: ComponentFixture<ProposalsListComponent>;
  let httpMock: HttpTestingController;

  const workspaceId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const orgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ProposalsListComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    const admin = TestBed.inject(AdminStore);
    admin.selectOrg(orgId);
    admin.selectWorkspace(workspaceId);

    fixture = TestBed.createComponent(ProposalsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const listReq = httpMock.expectOne(
      (req) => req.url === `/api/v1/workspaces/${workspaceId}/ai/action-proposals`
    );
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

  it('should have status filter signal', () => {
    expect(component.statusFilter).toBeDefined();
    expect(component.statusFilter()).toBe('');
  });
});
