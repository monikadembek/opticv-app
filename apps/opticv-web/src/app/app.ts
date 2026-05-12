import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TopHeader } from './layout/top-header/top-header';
import { Footer } from './layout/footer/footer';

@Component({
  imports: [RouterModule, TopHeader, Footer],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  userLabel = signal('U');
  isUserLoggedIn = signal(false);

  executeSignOut() {
    // user log out
  }
}
