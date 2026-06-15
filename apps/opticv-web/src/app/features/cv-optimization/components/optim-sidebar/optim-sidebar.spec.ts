import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { OptimSidebar, NAV_GROUPS } from './optim-sidebar';
import { PromptType } from '@opticv/datatypes';

describe('OptimSidebar', () => {
  let fixture: ComponentFixture<OptimSidebar>;
  let component: OptimSidebar;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OptimSidebar],
    }).compileComponents();
    fixture = TestBed.createComponent(OptimSidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('nav items', () => {
    it('renders a nav button for every item across all groups', () => {
      fixture.componentRef.setInput('pageState', 'completed');
      fixture.detectChanges();
      const allItems = NAV_GROUPS.flatMap((g) => g.items);
      const buttons = fixture.nativeElement.querySelectorAll('button.nav-item');
      expect(buttons.length).toBe(allItems.length);
    });

    it('marks the active section button with active class', () => {
      fixture.componentRef.setInput('pageState', 'completed');
      fixture.componentRef.setInput('activeSection', PromptType.KEYWORD_GAP);
      fixture.detectChanges();
      const activeBtn = fixture.nativeElement.querySelector('button.nav-item.active');
      expect(activeBtn).toBeTruthy();
      expect(activeBtn.textContent).toContain('Keyword Gap');
    });

    it('disables nav buttons when pageState is initial', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button.nav-item');
      buttons.forEach((btn: HTMLButtonElement) => {
        expect(btn.disabled).toBe(true);
      });
    });

    it('enables nav buttons when pageState is completed', () => {
      fixture.componentRef.setInput('pageState', 'completed');
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll('button.nav-item');
      buttons.forEach((btn: HTMLButtonElement) => {
        expect(btn.disabled).toBe(false);
      });
    });

    it('emits sectionClicked with item id when nav button is clicked', () => {
      fixture.componentRef.setInput('pageState', 'completed');
      fixture.detectChanges();
      const emitSpy = vi.spyOn(component.sectionClicked, 'emit');
      const firstBtn = fixture.debugElement.query(By.css('button.nav-item'));
      firstBtn.triggerEventHandler('click');
      expect(emitSpy).toHaveBeenCalledOnce();
    });

    it('shows group labels when expanded', () => {
      fixture.componentRef.setInput('expanded', true);
      fixture.detectChanges();
      const labels = fixture.nativeElement.querySelectorAll('.sidebar-group-label');
      expect(labels.length).toBe(NAV_GROUPS.length);
    });

    it('hides group labels and shows dividers when collapsed', () => {
      fixture.componentRef.setInput('expanded', false);
      fixture.detectChanges();
      const labels = fixture.nativeElement.querySelectorAll('.sidebar-group-label');
      const dividers = fixture.nativeElement.querySelectorAll('.sidebar-divider');
      expect(labels.length).toBe(0);
      expect(dividers.length).toBe(NAV_GROUPS.length);
    });

    it('shows spinner icon for items in processingSet', () => {
      fixture.componentRef.setInput('pageState', 'completed');
      fixture.componentRef.setInput('processingSet', new Set([PromptType.KEYWORD_GAP]));
      fixture.detectChanges();
      const spinner = fixture.nativeElement.querySelector('.pi-spinner');
      expect(spinner).toBeTruthy();
    });

    it('shows check-circle icon for items with completed status', () => {
      fixture.componentRef.setInput('pageState', 'completed');
      fixture.componentRef.setInput(
        'statuses',
        new Map([[PromptType.KEYWORD_GAP, 'completed']]),
      );
      fixture.detectChanges();
      const check = fixture.nativeElement.querySelector('.pi-check-circle');
      expect(check).toBeTruthy();
    });

    it('shows times-circle icon for items with failed status', () => {
      fixture.componentRef.setInput('pageState', 'completed');
      fixture.componentRef.setInput(
        'statuses',
        new Map([[PromptType.KEYWORD_GAP, 'failed']]),
      );
      fixture.detectChanges();
      const error = fixture.nativeElement.querySelector('.pi-times-circle');
      expect(error).toBeTruthy();
    });
  });

  describe('toggle button', () => {
    it('emits toggleClicked when toggle button is clicked', () => {
      const emitSpy = vi.spyOn(component.toggleClicked, 'emit');
      const toggleBtn = fixture.debugElement.query(By.css('.sidebar-toggle button'));
      toggleBtn.triggerEventHandler('click');
      expect(emitSpy).toHaveBeenCalledOnce();
    });

    it('shows chevron-left icon when expanded', () => {
      fixture.componentRef.setInput('expanded', true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.pi-chevron-left')).toBeTruthy();
    });

    it('shows chevron-right icon when collapsed', () => {
      fixture.componentRef.setInput('expanded', false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.pi-chevron-right')).toBeTruthy();
    });
  });

  describe('showScores computed', () => {
    it('is false when pageState is initial', () => {
      fixture.componentRef.setInput('atsScore', 75);
      fixture.detectChanges();
      expect(component.showScores()).toBe(false);
    });

    it('is false when atsScore is null', () => {
      fixture.componentRef.setInput('pageState', 'completed');
      fixture.detectChanges();
      expect(component.showScores()).toBe(false);
    });

    it('is false when not expanded even with a valid score', () => {
      fixture.componentRef.setInput('pageState', 'completed');
      fixture.componentRef.setInput('atsScore', 75);
      fixture.componentRef.setInput('expanded', false);
      fixture.detectChanges();
      expect(component.showScores()).toBe(false);
    });

    it('is true when pageState is completed, expanded and atsScore is set', () => {
      fixture.componentRef.setInput('pageState', 'completed');
      fixture.componentRef.setInput('atsScore', 75);
      fixture.componentRef.setInput('expanded', true);
      fixture.detectChanges();
      expect(component.showScores()).toBe(true);
    });

    it('renders score rings when showScores is true', () => {
      fixture.componentRef.setInput('pageState', 'completed');
      fixture.componentRef.setInput('atsScore', 75);
      fixture.componentRef.setInput('expanded', true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.sidebar-scores')).toBeTruthy();
    });
  });

  describe('scoreCircumference and scoreDash', () => {
    it('scoreCircumference returns 2πr', () => {
      expect(component.scoreCircumference(22)).toBeCloseTo(2 * Math.PI * 22);
    });

    it('scoreDash returns full circumference for score 100', () => {
      expect(component.scoreDash(100, 22)).toBeCloseTo(component.scoreCircumference(22));
    });

    it('scoreDash returns 0 for score 0', () => {
      expect(component.scoreDash(0, 22)).toBeCloseTo(0);
    });

    it('scoreDash returns half circumference for score 50', () => {
      expect(component.scoreDash(50, 22)).toBeCloseTo(component.scoreCircumference(22) / 2);
    });

    it('scoreDash treats null score as 0', () => {
      expect(component.scoreDash(null, 22)).toBeCloseTo(0);
    });
  });

  describe('host class binding', () => {
    it('adds collapsed class to host when expanded is false', () => {
      fixture.componentRef.setInput('expanded', false);
      fixture.detectChanges();
      expect(fixture.nativeElement.classList.contains('collapsed')).toBe(true);
    });

    it('does not add collapsed class when expanded is true', () => {
      fixture.componentRef.setInput('expanded', true);
      fixture.detectChanges();
      expect(fixture.nativeElement.classList.contains('collapsed')).toBe(false);
    });
  });
});
