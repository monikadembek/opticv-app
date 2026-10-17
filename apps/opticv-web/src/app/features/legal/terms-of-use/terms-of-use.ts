import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms-of-use',
  imports: [RouterLink],
  templateUrl: './terms-of-use.html',
  styleUrl: '../legal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsOfUse {}
