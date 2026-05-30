import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OptimizationResultPanel } from './optimization-result-panel';

describe('OptimizationResultPanel', () => {
  let fixture: ComponentFixture<OptimizationResultPanel>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [OptimizationResultPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(OptimizationResultPanel);
  });

  it('renders skeleton when loading=true regardless of other inputs', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.componentRef.setInput('error', 'some error');
    fixture.componentRef.setInput('hasData', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[aria-label="Loading results"]')).toBeTruthy();
  });

  it('renders error message when loading=false and error is set', () => {
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', 'Something went wrong');
    fixture.componentRef.setInput('hasData', false);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Something went wrong');
    expect(el.querySelector('[aria-label="Loading results"]')).toBeFalsy();
  });

  it('renders empty placeholder when no data and no error', () => {
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('hasData', false);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Run optimization to see results');
  });

  it('renders ng-content slot when loading=false, error=null, hasData=true', () => {
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.componentRef.setInput('hasData', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[aria-label="Loading results"]')).toBeFalsy();
    expect(el.textContent).not.toContain('Something went wrong');
    expect(el.textContent).not.toContain('Run optimization to see results');
  });
});
