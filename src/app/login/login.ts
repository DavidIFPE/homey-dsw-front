
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import axios from 'axios';
import api from '../services/api';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.css',
})
export class Login {
  email = '';
  password = '';
  token?: string;
  errorMessage = '';
  successMessage = '';

  constructor(private router: Router) {}

  async onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';
    try {
      const response = await axios.post('http://localhost:8080/autenticacao/login', {
        email: this.email,
        password: this.password
      });
      if (response.status === 200) {
        this.successMessage = 'Login realizado com sucesso!'; 
        this.token = response.data.token;
        // Salva o token para o interceptor em services/api.ts conseguir enviar nas próximas requisições
        if (this.token) {
          localStorage.setItem('token', this.token);
        }
        
        // Busca os dados do usuário logado após obter o token
        try {
          const usuarioResponse = await api.get('/autenticacao/me');
          if (usuarioResponse.data) {
            localStorage.setItem('user', JSON.stringify(usuarioResponse.data));
            const userType = usuarioResponse.data.tipo;
            
            if (userType === 'PRESTADOR') {
              this.router.navigate(['/servicos']);
            } else {
              this.router.navigate(['/']);
            }
          }
        } catch (error) {
          // Se falhar ao obter dados, ainda assim faz logout
          localStorage.removeItem('token');
          this.errorMessage = 'Erro ao buscar dados do usuário. Tente novamente.';
        }
        
      } else {
        this.errorMessage = 'Falha no login. Verifique suas credenciais.';
      }
    } catch (error: any) {
      this.errorMessage = error?.response?.data?.message || 'Erro ao tentar fazer login.';
    }
  }
}
