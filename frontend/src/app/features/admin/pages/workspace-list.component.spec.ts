import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { WorkspaceListComponent } from './workspace-list.component';
import { WorkspaceApiService } from '../services/workspace-api.service';
import { AdminStore } from '../store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { of } from 'rxjs';

describe('WorkspaceListComponent', () => {
  let component: WorkspaceListComponent;
  let fixture: ComponentFixture<WorkspaceListComponent>;
  let mockWsApi: jasmine.SpyObj<WorkspaceApiService>;
  let store: AdminStore;

  const mockWorkspaces = [
    {
      id: 'ws-1',
      orgId: 'org-1',
      name: 'US Market',
      market: 'US',
      status: 'ACTIVE' as const,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'ws-2',
      orgId: 'org-1',
      name: 'India Market',
      market: 'IN',
      status: 'ARCHIVED' as const,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    mockWsApi = jasmine.createSpyObj('WorkspaceApiService', ['list', 'archive', 'restore']);
    mockWsApi.list.and.returnValue(of(mockWorkspaces));

    await TestBed.configureTestingModule({
      imports: [WorkspaceListComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        { provide: WorkspaceApiService, useValue: mockWsApi },
        AdminStore,
        NotificationService,
      ],
    }).compileComponents();

    store = TestBed.inject(AdminStore);
    store.selectOrg('org-1');

    fixture = TestBed.createComponent(WorkspaceListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render workspace rows in the table', () => {
    const rows = fixture.nativeElement.querySelectorAll('table tbody tr, table tr.mat-mdc-row');
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it('should call workspace API with orgId from store', () => {
    expect(mockWsApi.list).toHaveBeenCalledWith('org-1', undefined, undefined);
  });
});
