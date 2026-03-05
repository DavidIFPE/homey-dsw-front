import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import api from '../services/api';
import { getUserFromToken } from '../services/authService';

interface ContratoClienteDTO {
  id: number;
  servicoId?: number;
  servicoTitulo?: string;
  prestadorNome?: string;
  dataInicio: string;
  dataFim: string;
  valorFinal: number;
  status: string;
  avaliado?: boolean;
}

@Component({
  selector: 'app-cliente-contratos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cliente-contratos.component.html',
  styleUrl: './cliente-contratos.component.css',
})
export class ClienteContratos implements OnInit {
  contratos = signal<ContratoClienteDTO[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(private router: Router) {}

  async ngOnInit() {
    const user = getUserFromToken() as any;
    const tipo = user?.tipo;

    if (!tipo || (tipo !== 'CLIENTE' && tipo !== 'cliente')) {
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
      const clienteId = (getUserFromToken() as any)?.id;
      const response = await api.get<ContratoClienteDTO[]>(`/contratos/cliente/${clienteId}`);
      this.contratos.set(response.data as any);
    } catch (error: any) {
      console.error('[ClienteContratos] Erro ao carregar contratos', error);
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

  canAvaliar(status: string, avaliado?: boolean): boolean {
    if (avaliado) return false;
    if (!status) return false;
    const normalized = status.toUpperCase();
    return normalized === 'CONCLUIDO';
  }

  navigateToAvaliar(contratoId: number) {
    this.router.navigate(['/avaliar-contrato', contratoId]);
  }

  navigateToNegociar(contrato: ContratoClienteDTO) {
    // Normaliza status e valida
    const status = (contrato.status || 'PENDENTE').toUpperCase();
    if (status !== 'PENDENTE') return; // segurança básica
  
    // Monta objeto mínimo de serviço para pré-preencher a tela unificada
    const servicoState = {
      id: contrato.servicoId,
      titulo: contrato.servicoTitulo ?? `Serviço #${contrato.servicoId}`,
      // Se não tiver um preço base aqui, pode usar 0 (o usuário ajusta na tela)
      precoBase: contrato.valorFinal ?? 0,
    };
  
    // Navega para a tela unificada (form + histórico),
    // levando também o contratoId para já carregar a timeline
    this.router.navigate(
      ['/servicos', contrato.servicoId, 'proposta'],
      {
        state: {
          servico: servicoState,
          contratoId: contrato.id,
        },
      }
    );
  }
}
