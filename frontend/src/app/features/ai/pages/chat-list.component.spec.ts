import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ChatListComponent } from './chat-list.component';
import { AdminStore } from '../../admin/store/admin.store';

describe('ChatListComponent', () => {
  let component: ChatListComponent;
  let fixture: ComponentFixture<ChatListComponent>;
  let httpMock: HttpTestingController;
  let adminStore: AdminStore;

  const workspaceId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const orgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ChatListComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    adminStore = TestBed.inject(AdminStore);
    adminStore.selectOrg(orgId);
    adminStore.selectWorkspace(workspaceId);

    fixture = TestBed.createComponent(ChatListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const listReq = httpMock.expectOne(
      (req) => req.url === `/api/v1/workspaces/${workspaceId}/ai/conversations`
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

  it('should have conversations signal', () => {
    expect(component.conversations).toBeDefined();
    expect(component.conversations()).toEqual([]);
  });

  it('should show empty state when no conversations', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Start your first AI conversation');
  });
});
