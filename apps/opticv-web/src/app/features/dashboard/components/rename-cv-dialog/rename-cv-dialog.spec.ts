import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Dialog } from 'primeng/dialog';
import { RenameCvDialog } from './rename-cv-dialog';

describe('RenameCvDialog', () => {
  let fixture: ComponentFixture<RenameCvDialog>;
  let component: RenameCvDialog;

  const open = (name = 'My CV') => {
    fixture.componentRef.setInput('cvName', name);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
  };

  const close = () => {
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
  };

  const nameInput = (): HTMLInputElement | null =>
    document.querySelector('#rename-cv-name');

  const typeName = (value: string) => {
    const input = nameInput();
    if (!input) throw new Error('name input not rendered');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const footerButton = (label: string) =>
    fixture.debugElement
      .queryAll(By.css('p-button'))
      .find((b) => b.componentInstance.label === label);

  const dialog = () => fixture.debugElement.query(By.directive(Dialog));

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RenameCvDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(RenameCvDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('prefill', () => {
    it('prefills the control from cvName when it becomes visible', () => {
      open('Frontend CV');
      expect(component.nameControl.value).toBe('Frontend CV');
      expect(nameInput()?.value).toBe('Frontend CV');
    });

    it('resets the value and touched state when reopened', () => {
      open('First');
      typeName('');
      component.nameControl.markAsTouched();
      close();

      open('Second');

      expect(component.nameControl.value).toBe('Second');
      expect(component.nameControl.touched).toBe(false);
      expect(component.nameControl.dirty).toBe(false);
    });

    it('does not reset the value when cvName changes while open', () => {
      open('First');
      typeName('Edited');

      fixture.componentRef.setInput('cvName', 'Other');
      fixture.detectChanges();

      expect(component.nameControl.value).toBe('Edited');
    });
  });

  describe('validation', () => {
    beforeEach(() => open());

    it.each([
      ['empty', ''],
      ['whitespace-only', '   '],
      ['101 characters', 'a'.repeat(101)],
    ])('disables Save for a %s name', (_, value) => {
      component.nameControl.setValue(value);
      fixture.detectChanges();
      expect(footerButton('Save')?.componentInstance.disabled).toBe(true);
    });

    it('enables Save for a valid name', () => {
      expect(footerButton('Save')?.componentInstance.disabled).toBe(false);
    });

    it('does not show the error before the field is touched or dirty', () => {
      component.nameControl.setValue('');
      fixture.detectChanges();
      expect(document.querySelector('#rename-cv-name-error')).toBeNull();
      expect(nameInput()?.getAttribute('aria-describedby')).toBeNull();
    });

    it('shows a linked required error once the field is dirty', () => {
      typeName('  ');

      const error = document.querySelector('#rename-cv-name-error');
      expect(error?.textContent).toContain('Name is required.');
      expect(error?.getAttribute('role')).toBe('alert');
      expect(nameInput()?.getAttribute('aria-describedby')).toBe(
        'rename-cv-name-error',
      );
      expect(nameInput()?.getAttribute('aria-invalid')).toBe('true');
    });

    it('shows the max length error', () => {
      component.nameControl.setValue('a'.repeat(101));
      component.nameControl.markAsDirty();
      fixture.detectChanges();

      expect(
        document.querySelector('#rename-cv-name-error')?.textContent,
      ).toContain('Name must be 100 characters or fewer.');
    });
  });

  describe('submitting', () => {
    beforeEach(() => open());

    it('emits the trimmed name on Save', () => {
      const emitSpy = vi.spyOn(component.save, 'emit');
      typeName('  New name  ');

      footerButton('Save')?.triggerEventHandler(
        'onClick',
        new MouseEvent('click'),
      );

      expect(emitSpy).toHaveBeenCalledWith('New name');
    });

    it('emits the name when the form is submitted with Enter', () => {
      const emitSpy = vi.spyOn(component.save, 'emit');
      typeName('Via enter');

      const form = nameInput()?.closest('form');
      expect(form).toBeTruthy();
      form?.dispatchEvent(new Event('submit', { cancelable: true }));

      expect(emitSpy).toHaveBeenCalledWith('Via enter');
    });

    it('does not emit and marks the control touched when invalid', () => {
      const emitSpy = vi.spyOn(component.save, 'emit');
      component.nameControl.setValue('');

      component.submit();

      expect(emitSpy).not.toHaveBeenCalled();
      expect(component.nameControl.touched).toBe(true);
    });

    it('does not emit while saving', () => {
      const emitSpy = vi.spyOn(component.save, 'emit');
      fixture.componentRef.setInput('saving', true);
      fixture.detectChanges();

      component.submit();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('closing', () => {
    beforeEach(() => open());

    it('emits dismiss when Cancel is clicked', () => {
      const emitSpy = vi.spyOn(component.dismiss, 'emit');

      footerButton('Cancel')?.triggerEventHandler(
        'onClick',
        new MouseEvent('click'),
      );

      expect(emitSpy).toHaveBeenCalledOnce();
    });

    it('emits dismiss when the dialog reports visibleChange(false)', () => {
      const emitSpy = vi.spyOn(component.dismiss, 'emit');

      dialog().triggerEventHandler('visibleChange', false);

      expect(emitSpy).toHaveBeenCalledOnce();
    });

    it('returns focus to the element that opened the dialog on hide', () => {
      close();
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      trigger.focus();

      open();
      trigger.blur();
      component.onHide();

      expect(document.activeElement).toBe(trigger);
      trigger.remove();
    });
  });

  describe('saving state', () => {
    beforeEach(() => {
      open();
      fixture.componentRef.setInput('saving', true);
      fixture.detectChanges();
    });

    it('disables Save and shows it loading', () => {
      const save = footerButton('Save')?.componentInstance;
      expect(save.disabled).toBe(true);
      expect(save.loading).toBe(true);
    });

    it('disables Cancel', () => {
      expect(footerButton('Cancel')?.componentInstance.disabled).toBe(true);
    });

    it('cannot be closed', () => {
      const emitSpy = vi.spyOn(component.dismiss, 'emit');
      const dialogInstance = dialog().componentInstance as Dialog;

      expect(dialogInstance.closable).toBe(false);
      expect(dialogInstance.closeOnEscape).toBe(false);

      component.onVisibleChange(false);
      component.cancel();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('keeps the entered value when saving ends while still visible', () => {
      fixture.componentRef.setInput('saving', false);
      fixture.detectChanges();
      typeName('Kept value');
      fixture.componentRef.setInput('saving', true);
      fixture.detectChanges();

      fixture.componentRef.setInput('saving', false);
      fixture.detectChanges();

      expect(component.nameControl.value).toBe('Kept value');
    });
  });
});
