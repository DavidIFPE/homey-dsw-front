import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { isAuthenticated } from '../services/authService';

@Component({
  selector: 'app-landing-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing-home.component.html',
  styleUrl: './landing-home.component.css'
})
export class LandingHome implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    // Se já estiver autenticado, vai direto para a listagem de serviços
    if (isAuthenticated()) {
      this.router.navigate(['/servicos']);
    }
  }
}
