import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { MobileTabs } from './mobile-tabs';
import { PromptType } from '@opticv/datatypes';
import { NAV_GROUPS } from '../optim-sidebar/optim-sidebar';

describe('MobileTabs', () => {
  let fixture: ComponentFixture<MobileTabs>;
  let component: MobileTabs;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileTabs],
    }).compileComponents();
    fixture = TestBed.createComponent(MobileTabs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders a tab button for every visible nav item (default cv-analysis tab)', () => {
    const expectedItems = NAV_GROUPS.filter(
      (g) => g.group === 'Job Posting' || g.group === 'Resume Analysis',
    ).flatMap((g) => g.items);
    const buttons = fixture.nativeElement.querySelectorAll('.mobile-tab');
    expect(buttons.length).toBe(expectedItems.length);
  });

  it('marks the active section tab with the active class', () => {
    fixture.componentRef.setInput('activeSection', PromptType.KEYWORD_GAP);
    fixture.detectChanges();
    const activeBtn = fixture.nativeElement.querySelector('.mobile-tab.active');
    expect(activeBtn).toBeTruthy();
    expect(activeBtn.textContent).toContain('Keyword');
  });

  it('does not apply active class to inactive tabs', () => {
    fixture.componentRef.setInput('activeSection', PromptType.RESUME_AUTOPSY);
    fixture.detectChanges();
    const activeBtns = fixture.nativeElement.querySelectorAll('.mobile-tab.active');
    expect(activeBtns.length).toBe(1);
  });

  it('emits sectionClicked with the item id when a tab is clicked', () => {
    const emitSpy = vi.spyOn(component.sectionClicked, 'emit');
    const firstTab = fixture.debugElement.query(By.css('.mobile-tab'));
    firstTab.triggerEventHandler('click');
    expect(emitSpy).toHaveBeenCalledWith(NAV_GROUPS[0].items[0].id);
  });

  it('navItems matches all items from NAV_GROUPS by default (cv-analysis tab)', () => {
    const expectedItems = NAV_GROUPS.filter(
      (g) => g.group === 'Job Posting' || g.group === 'Resume Analysis',
    ).flatMap((g) => g.items);
    expect(component.navItems()).toEqual(expectedItems);
  });

  describe('activeTab filtering', () => {
    it('shows Job Posting + Resume Analysis items when activeTab is cv-analysis', () => {
      fixture.componentRef.setInput('activeTab', 'cv-analysis');
      fixture.detectChanges();
      const expectedItems = NAV_GROUPS.filter(
        (g) => g.group === 'Job Posting' || g.group === 'Resume Analysis',
      ).flatMap((g) => g.items);
      const buttons = fixture.nativeElement.querySelectorAll('.mobile-tab');
      expect(buttons.length).toBe(expectedItems.length);
    });

    it('shows Job Posting + Additional Materials items when activeTab is additional-materials', () => {
      fixture.componentRef.setInput('activeTab', 'additional-materials');
      fixture.detectChanges();
      const expectedItems = NAV_GROUPS.filter(
        (g) => g.group === 'Job Posting' || g.group === 'Additional Materials',
      ).flatMap((g) => g.items);
      const buttons = fixture.nativeElement.querySelectorAll('.mobile-tab');
      expect(buttons.length).toBe(expectedItems.length);
      expect(
        Array.from(buttons as NodeListOf<HTMLButtonElement>).some((b) =>
          b.textContent?.includes('Keyword'),
        ),
      ).toBe(false);
    });
  });
});
