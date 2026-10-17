import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { PrivacyPolicy } from './privacy-policy';

describe('PrivacyPolicy', () => {
  let fixture: ComponentFixture<PrivacyPolicy>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [PrivacyPolicy],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyPolicy);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the page heading', () => {
    const h1 = fixture.debugElement.query(By.css('h1'));
    expect(h1.nativeElement.textContent).toContain('Privacy Policy');
  });

  it('should name the data controller and contact email', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Monika Dembek');
    expect(text).toContain('opticvapp@gmail.com');
  });

  it('should include the cookies section', () => {
    expect(fixture.debugElement.query(By.css('#cookies'))).toBeTruthy();
  });

  it('should link to the Terms of Use', () => {
    const link = fixture.debugElement.query(By.css('a[href="/terms-of-use"]'));
    expect(link).toBeTruthy();
  });
});
