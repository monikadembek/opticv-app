import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { TermsOfUse } from './terms-of-use';

describe('TermsOfUse', () => {
  let fixture: ComponentFixture<TermsOfUse>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TermsOfUse],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TermsOfUse);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the page heading', () => {
    const h1 = fixture.debugElement.query(By.css('h1'));
    expect(h1.nativeElement.textContent).toContain('Terms of Use');
  });

  it('should include the right of withdrawal and the model withdrawal form', () => {
    expect(fixture.debugElement.query(By.css('#withdrawal'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('#withdrawal-form'))).toBeTruthy();
  });

  it('should link to the Privacy Policy', () => {
    const link = fixture.debugElement.query(By.css('a[href="/privacy"]'));
    expect(link).toBeTruthy();
  });
});
