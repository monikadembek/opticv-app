import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Footer } from './footer';

describe('Footer', () => {
  let component: Footer;
  let fixture: ComponentFixture<Footer>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Footer],
    }).compileComponents();

    fixture = TestBed.createComponent(Footer);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render a footer element with class main-footer', () => {
    const footer = fixture.debugElement.query(By.css('footer.main-footer'));
    expect(footer).toBeTruthy();
  });

  it('should display copyright text', () => {
    expect(fixture.nativeElement.textContent).toContain('2026 OptiCV.');
  });

  it('should render a Facebook link', () => {
    const link = fixture.debugElement.query(
      By.css(
        'a[href="https://www.facebook.com/profile.php?id=61591526651342"]',
      ),
    );
    expect(link).toBeTruthy();
  });

  it('should render a Facebook icon', () => {
    const icon = fixture.debugElement.query(By.css('a i.pi-facebook'));
    expect(icon).toBeTruthy();
  });
});
