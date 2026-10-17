import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy-policy',
  imports: [RouterLink],
  templateUrl: './privacy-policy.html',
  styleUrl: '../legal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicy {}
