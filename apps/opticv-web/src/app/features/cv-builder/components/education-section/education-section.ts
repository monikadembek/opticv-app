import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import type { CvEducationItem } from '@opticv/datatypes';

const EMPTY_EDUCATION_ITEM: CvEducationItem = {
  degree: null,
  institution: null,
  location: null,
  startDate: null,
  endDate: null,
  field: null,
};

@Component({
  selector: 'app-education-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, InputTextModule],
  templateUrl: './education-section.html',
  styleUrl: './education-section.css',
})
export class EducationSection {
  readonly items = model.required<CvEducationItem[]>();

  addItem(): void {
    this.items.update((list) => [...list, { ...EMPTY_EDUCATION_ITEM }]);
  }

  removeItem(index: number): void {
    this.items.update((list) => list.filter((_, i) => i !== index));
  }

  updateField(
    index: number,
    field: keyof CvEducationItem,
    value: string,
  ): void {
    this.items.update((list) =>
      list.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }
}
