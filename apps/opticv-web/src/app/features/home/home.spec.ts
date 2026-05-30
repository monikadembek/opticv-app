import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let router: Router;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Home],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the hero heading', () => {
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent.trim()).toBe('CV Online');
  });

  it('should render the Optimize CV button', () => {
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'p-button[label="Optimize CV"]',
    );
    expect(button).not.toBeNull();
  });

  it('should render the Sign In account button', () => {
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'p-button[label="Sign In"]',
    );
    expect(button).not.toBeNull();
  });

  it('should navigate to optimize-cv when goToCreator is called', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.goToCreator();
    expect(navigateSpy).toHaveBeenCalledWith(['optimize-cv']);
  });

  it('should navigate to login when signIn is called', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.signIn();
    expect(navigateSpy).toHaveBeenCalledWith(['login']);
  });
});
