import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import type { CvExperienceItem } from '@opticv/datatypes';

const EMPTY_EXPERIENCE_ITEM: CvExperienceItem = {
  title: null,
  company: null,
  location: null,
  startDate: null,
  endDate: null,
  current: false,
  bullets: [],
};

@Component({
  selector: 'app-experience-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, InputTextModule, CheckboxModule],
  templateUrl: './experience-section.html',
  styleUrl: './experience-section.css',
})
export class ExperienceSection {
  readonly items = model.required<CvExperienceItem[]>();

  addItem(): void {
    this.items.update((list) => [...list, { ...EMPTY_EXPERIENCE_ITEM }]);
  }

  removeItem(index: number): void {
    this.items.update((list) => list.filter((_, i) => i !== index));
  }

  updateField(
    index: number,
    field: keyof Omit<CvExperienceItem, 'bullets'>,
    value: string | boolean,
  ): void {
    this.items.update((list) =>
      list.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  addBullet(index: number): void {
    this.items.update((list) =>
      list.map((item, i) =>
        i === index
          ? { ...item, bullets: [...(item.bullets ?? []), ''] }
          : item,
      ),
    );
  }

  updateBullet(index: number, bulletIndex: number, value: string): void {
    this.items.update((list) =>
      list.map((item, i) =>
        i === index
          ? {
              ...item,
              bullets: (item.bullets ?? []).map((b, bi) =>
                bi === bulletIndex ? value : b,
              ),
            }
          : item,
      ),
    );
  }

  removeBullet(index: number, bulletIndex: number): void {
    this.items.update((list) =>
      list.map((item, i) =>
        i === index
          ? {
              ...item,
              bullets: (item.bullets ?? []).filter(
                (_, bi) => bi !== bulletIndex,
              ),
            }
          : item,
      ),
    );
  }
}
