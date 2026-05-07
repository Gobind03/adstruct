import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PromptListComponent } from './prompt-list.component';
import { AdminStore } from '../../admin/store/admin.store';

describe('PromptListComponent', () => {
  let component: PromptListComponent;
  let fixture: ComponentFixture<PromptListComponent>;
  let httpMock: HttpTestingController;

  const orgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PromptListComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    const admin = TestBed.inject(AdminStore);
    admin.selectOrg(orgId);

    fixture = TestBed.createComponent(PromptListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const listReq = httpMock.expectOne(
      (req) => req.url === `/api/v1/orgs/${orgId}/ai/prompts`
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

  it('should have filter signals', () => {
    expect(component.purposeFilter).toBeDefined();
    expect(component.statusFilter).toBeDefined();
    expect(component.tagFilter).toBeDefined();
    expect(component.purposeFilter()).toBe('');
    expect(component.statusFilter()).toBe('');
    expect(component.tagFilter()).toBe('');
  });

  it('should have purpose options', () => {
    expect(component.purposes.length).toBeGreaterThan(0);
    expect(component.purposes).toContain('GENERATE');
  });
});
