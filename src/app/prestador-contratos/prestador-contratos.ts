import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import api from '../services/api';
import { getUserFromToken } from '../services/authService';

interface ContratoResponseDTO {
  id: number;
  servicoId?: number;
  servicoTitulo?: string;
  clienteNome?: string;
  dataInicio: string;
  dataFim: string;
  valorFinal: number;
  status: string;
}

@Component({
  selector: 'app-prestador-contratos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './prestador-contratos.component.html',
  styleUrl: './prestador-contratos.component.css',
})
export class PrestadorContratos implements OnInit {
  contratos = signal<ContratoResponseDTO[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(private router: Router) {}

  async ngOnInit() {
    const user = getUserFromToken() as any;
    const tipo = user?.tipo;

    if (!tipo || (tipo !== 'PRESTADOR' && tipo !== 'prestador')) {
      this.router.navigate(['/']);
      return;
    }

    await this.carregarContratos();
  }

  async carregarContratos() {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const prestadorId = (getUserFromToken() as any)?.id;
      const response = await api.get<ContratoResponseDTO[]>(`/contratos/prestador/${prestadorId}`);
      this.contratos.set(response.data as any);
    } catch (error: any) {
      console.error('[PrestadorContratos] Erro ao carregar contratos', error);
      if (error?.response?.status === 401) {
        this.errorMessage.set('Acesso não autorizado. Faça login novamente.');
      } else {
        this.errorMessage.set('Não foi possível carregar seus contratos.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  formatData(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  canAceitar(status: string): boolean {
    if (!status) return true;
    const normalized = status.toUpperCase();
    return normalized === 'PENDENTE';
  }

  canFinalizar(status: string): boolean {
    if (!status) return false;
    const normalized = status.toUpperCase();
    return normalized === 'ATIVO';
  }

  async aceitarContrato(contrato: ContratoResponseDTO) {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await api.patch(`/contratos/${contrato.id}/status`, null, {
        params: { status: 'ATIVO' },
      });

      this.successMessage.set('Contrato aceito com sucesso.');

      this.contratos.update((lista) =>
        lista.map((c) => (c.id === contrato.id ? { ...c, status: 'ATIVO' } : c)),
      );
    } catch (error: any) {
      console.error('[PrestadorContratos] Erro ao aceitar contrato', error);
      this.errorMessage.set(
        error?.response?.data?.message || 'Não foi possível aceitar o contrato.',
      );
    }
  }

  private async atualizarStatus(
    contrato: ContratoResponseDTO,
    status: 'ATIVO' | 'CONCLUIDO' | 'CANCELADO',
    sucessoMensagem: string,
  ) {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await api.patch(`/contratos/${contrato.id}/status`, null, {
        params: { status },
      });

      this.successMessage.set(sucessoMensagem);

      this.contratos.update((lista) =>
        lista.map((c) => (c.id === contrato.id ? { ...c, status } : c)),
      );
    } catch (error: any) {
      console.error('[PrestadorContratos] Erro ao atualizar status do contrato', error);
      this.errorMessage.set(
        error?.response?.data?.message || 'Não foi possível atualizar o status do contrato.',
      );
    }
  }

  async concluirContrato(contrato: ContratoResponseDTO) {
    await this.atualizarStatus(contrato, 'CONCLUIDO', 'Contrato marcado como concluído.');
  }

  async cancelarContrato(contrato: ContratoResponseDTO) {
    await this.atualizarStatus(contrato, 'CANCELADO', 'Contrato cancelado com sucesso.');
  }
}
