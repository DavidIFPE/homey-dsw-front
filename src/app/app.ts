import { Component, signal } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { AppHeaderComponent } from './app-header/app-header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule, AppHeaderComponent ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('homey-dsw-front');

  constructor(private router: Router) {}

  get showHeader(): boolean {
    const url = this.router.url;
    // Oculta o header nas telas de registro
    return !url.startsWith('/registro-prestador') && !url.startsWith('/registro-cliente');
  }
}
