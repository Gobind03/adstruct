import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RulesetDetailComponent } from './ruleset-detail.component';

describe('RulesetDetailComponent', () => {
  let component: RulesetDetailComponent;
  let fixture: ComponentFixture<RulesetDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RulesetDetailComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RulesetDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have edit rule form with required fields', () => {
    expect(component.editRuleForm).toBeDefined();
    expect(component.editRuleForm.get('ruleType')).toBeTruthy();
    expect(component.editRuleForm.get('severity')).toBeTruthy();
    expect(component.editRuleForm.get('name')).toBeTruthy();
  });
});
