import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import api from '../services/api';
import { getUserFromToken } from '../services/authService';

@Component({
  selector: 'app-proposta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proposta.component.html',
  styleUrl: './proposta.component.css',
})
export class Proposta {
  servicoId = signal(0);
  servicoTitulo = signal('');
  precoBase = signal(0);

  valor = signal(0);
  mensagem = '';
  prazoResposta = '';

  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  constructor(private route: ActivatedRoute, private router: Router) {
    this.servicoId.set(Number(this.route.snapshot.paramMap.get('id')));
    this.prazoResposta = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16);
    this.carregarDadosServico();
  }

  private carregarDadosServico() {
    const servicoData = history.state?.servico;
    if (servicoData) {
      this.servicoTitulo.set(servicoData.titulo);
      this.precoBase.set(servicoData.precoBase);
      this.valor.set(servicoData.precoBase);
    }
  }

  async onSubmit() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.valor() || this.valor() <= 0) {
      this.errorMessage.set('Informe um valor válido maior que 0.');
      return;
    }

    if (!this.prazoResposta) {
      this.errorMessage.set('Informe um prazo de resposta.');
      return;
    }

    this.isSubmitting.set(true);

    try {
      const user = getUserFromToken() as any;
      if (!user) {
        console.warn('[Proposta] Usuário não encontrado. Redirecionando para login.');
        this.router.navigate(['/login']);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('[Proposta] Token não encontrado no localStorage');
        this.errorMessage.set('Sessão expirada. Por favor, faça login novamente.');
        this.router.navigate(['/login']);
        return;
      }

      console.log('[Proposta] Enviando proposta com token:', token.substring(0, 20) + '...');

      const payload = {
        servicoId: this.servicoId(),
        valor: this.valor(),
        mensagem: this.mensagem || '',
        prazoResposta: new Date(this.prazoResposta),
      };

      console.log('[Proposta] Payload:', payload);

      const response = await api.post('/propostas', payload);
      if (response.status === 201 || response.status === 200) {
        this.successMessage.set('Proposta enviada com sucesso!');

        setTimeout(() => {
          this.router.navigate(['/servicos']);
        }, 1500);
      }
    } catch (error: any) {
      console.error('[Proposta] Erro completo:', error);
      console.error('[Proposta] Erro response:', error?.response);
      console.error('[Proposta] Erro message:', error?.message);

      if (error?.response?.status === 401) {
        this.errorMessage.set(
          'Autenticação inválida. Faça login novamente.'
        );
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.router.navigate(['/login']);
      } else {
        this.errorMessage.set(
          error?.response?.data?.message || 'Não foi possível enviar sua proposta.'
        );
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
