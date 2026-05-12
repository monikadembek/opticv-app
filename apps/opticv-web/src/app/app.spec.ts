import { Component, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { TopHeader } from './layout/top-header/top-header';
import { Footer } from './layout/footer/footer';

@Component({ selector: 'app-top-header', template: '', standalone: true })
class TopHeaderStub {
  isLoggedIn = input<boolean>(false);
  userLabel = input('U');
  signOut = output<void>();
}

@Component({ selector: 'app-footer', template: '', standalone: true })
class FooterStub {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    })
      .overrideComponent(App, {
        remove: { imports: [TopHeader, Footer] },
        add: { imports: [TopHeaderStub, FooterStub] },
      })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialize userLabel signal to "U"', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.userLabel()).toBe('U');
  });

  it('should initialize isUserLoggedIn signal to false', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.isUserLoggedIn()).toBe(false);
  });

  it('should render app-top-header', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-top-header')).toBeTruthy();
  });

  it('should render main element', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('main.main')).toBeTruthy();
  });

  it('should render app-footer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-footer')).toBeTruthy();
  });

  it('should pass isUserLoggedIn false to top-header by default', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.isUserLoggedIn()).toBe(false);
  });

  it('executeSignOut should not throw', () => {
    const fixture = TestBed.createComponent(App);
    expect(() => fixture.componentInstance.executeSignOut()).not.toThrow();
  });
});
