import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-home',
  imports: [ButtonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private router = inject(Router);

  goToCreator(): void {
    this.router.navigate(['optimize-cv']);
  }

  signIn(): void {
    this.router.navigate(['login']);
  }
}
