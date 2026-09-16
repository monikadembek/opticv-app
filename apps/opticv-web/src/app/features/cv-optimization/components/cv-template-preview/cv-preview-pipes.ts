import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'atsContact', pure: true })
export class AtsContactPipe implements PipeTransform {
  transform(parts: (string | null | undefined)[]): string {
    return parts.filter(Boolean).join('  |  ');
  }
}

@Pipe({ name: 'dateRange', pure: true })
export class DateRangePipe implements PipeTransform {
  transform(parts: (string | null | undefined)[]): string {
    return parts.filter(Boolean).join(' – ');
  }
}

@Pipe({ name: 'degreeField', pure: true })
export class DegreeFieldPipe implements PipeTransform {
  transform(parts: (string | null | undefined)[]): string {
    return parts.filter(Boolean).join(', ');
  }
}
