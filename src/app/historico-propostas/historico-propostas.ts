import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import api from '../services/api';
import { getUserFromToken } from '../services/authService';

interface PropostaResponseDTO {
  id: number;
  contratoId: number;
  remetenteId: number;
  destinatarioId: number;
  valor: number;
  mensagem?: string;
  prazoResposta: Date;
  status: 'PENDENTE' | 'ACEITA' | 'RECUSADA' | 'CONTRAPROPOSTA';
  propostaPaiId?: number;
  dataCriacao: Date;
}

@Component({
  selector: 'app-historico-propostas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historico-propostas.component.html',
  styleUrl: './historico-propostas.component.css',
})
export class HistoricoPropostas implements OnInit {
  contratoId = signal(0);
  propostas = signal<PropostaResponseDTO[]>([]);
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  contrapropostaAberta: number | null = null;
  novoValor = '';
  novaMensagem = '';
  isSubmittingContraproposta = false;
  usuarioIdAtual = getUserFromToken()?.id ?? null;

  constructor(private route: ActivatedRoute, private router: Router) {
    this.contratoId.set(Number(this.route.snapshot.paramMap.get('contratoId')));
  }

  async ngOnInit() {
    await this.carregarPropostas();
  }

  async carregarPropostas() {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        this.errorMessage.set('Sessão expirada. Faça login novamente.');
        return;
      }

      console.log('[HistoricoPropostas] Carregando propostas do contrato:', this.contratoId());
      const response = await api.get(`/propostas/contrato/${this.contratoId()}`);
      this.propostas.set(response.data || []);
    } catch (error: any) {
      console.error('[HistoricoPropostas] Erro ao carregar histórico', error);

      if (error?.response?.status === 401) {
        this.errorMessage.set('Autenticação inválida. Faça login novamente.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        this.errorMessage.set('Não foi possível carregar o histórico de propostas.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  async aceitarProposta(proposta: PropostaResponseDTO) {
    try {
      const response = await api.post(`/propostas/${proposta.id}/aceitar`);
      if (response.status === 200) {
        this.successMessage.set('Proposta aceita com sucesso!');
        await this.carregarPropostas();
      }
    } catch (error: any) {
      console.error('[HistoricoPropostas] Erro ao aceitar proposta', error);

      if (error?.response?.status === 401) {
        this.errorMessage.set('Autenticação inválida. Faça login novamente.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        this.errorMessage.set('Não foi possível aceitar a proposta.');
      }
    }
  }

  async recusarProposta(proposta: PropostaResponseDTO) {
    try {
      const response = await api.post(`/propostas/${proposta.id}/recusar`);
      if (response.status === 200) {
        this.successMessage.set('Proposta recusada.');
        await this.carregarPropostas();
      }
    } catch (error: any) {
      console.error('[HistoricoPropostas] Erro ao recusar proposta', error);

      if (error?.response?.status === 401) {
        this.errorMessage.set('Autenticação inválida. Faça login novamente.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        this.errorMessage.set('Não foi possível recusar a proposta.');
      }
    }
  }

  abrirContraproposta(propostaId: number) {
    this.contrapropostaAberta = propostaId;
    this.novoValor = '';
    this.novaMensagem = '';
  }

  fecharContraproposta() {
    this.contrapropostaAberta = null;
  }

  async enviarContraproposta() {
    if (!this.novoValor || parseFloat(this.novoValor) <= 0) {
      this.errorMessage.set('Informe um valor válido.');
      return;
    }

    this.isSubmittingContraproposta = true;
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const payload = {
        valor: parseFloat(this.novoValor),
        mensagem: this.novaMensagem || '',
        prazoResposta: new Date(Date.now() + 48 * 60 * 60 * 1000),
      };

      console.log('[HistoricoPropostas] Enviando contraproposta:', payload);

      const response = await api.post(
        `/propostas/${this.contrapropostaAberta}/contrapropor`,
        payload
      );

      if (response.status === 200) {
        this.successMessage.set('Contraproposta enviada com sucesso!');
        this.fecharContraproposta();
        await this.carregarPropostas();
      }
    } catch (error: any) {
      console.error('[HistoricoPropostas] Erro ao enviar contraproposta', error);

      if (error?.response?.status === 401) {
        this.errorMessage.set('Autenticação inválida. Faça login novamente.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        this.errorMessage.set('Não foi possível enviar a contraproposta.');
      }
    } finally {
      this.isSubmittingContraproposta = false;
    }
  }

  podeAceitar(proposta: PropostaResponseDTO): boolean {
    return (
      (proposta.status === 'PENDENTE' || proposta.status === 'CONTRAPROPOSTA') &&
      proposta.destinatarioId === this.usuarioIdAtual
    );
  }
  
  podeContrapropor(proposta: PropostaResponseDTO): boolean {
    return (
      (proposta.status === 'PENDENTE' || proposta.status === 'CONTRAPROPOSTA') &&
      proposta.destinatarioId === this.usuarioIdAtual
    );
  }
  
  podeRecusar(proposta: PropostaResponseDTO): boolean {
    return (
      (proposta.status === 'PENDENTE' || proposta.status === 'CONTRAPROPOSTA') &&
      proposta.destinatarioId === this.usuarioIdAtual
    );
  }

  formatarData(data: Date): string {
    return new Date(data).toLocaleString('pt-BR');
  }

  getStatusClass(status: string): string {
    return `proposta-status--${status.toLowerCase()}`;
  }

  
  // Helpers visuais
  ehVoce(idUsuario: number): boolean {
    return this.usuarioIdAtual != null && idUsuario === this.usuarioIdAtual;
  }

}
