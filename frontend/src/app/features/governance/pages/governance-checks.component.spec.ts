import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { GovernanceChecksComponent } from './governance-checks.component';

describe('GovernanceChecksComponent', () => {
  let component: GovernanceChecksComponent;
  let fixture: ComponentFixture<GovernanceChecksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GovernanceChecksComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(GovernanceChecksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have platform type options', () => {
    expect(component.platformTypes).toBeDefined();
    expect(component.platformTypes.length).toBeGreaterThan(0);
  });
});
