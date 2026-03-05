import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PropostasApiService } from '../services/propostasApiService';
import { getUserFromToken } from '../services/authService';

type PropostaResponseDTO = {
  id: number;
  contratoId: number;
  remetenteId: number | null;
  destinatarioId: number | null;
  valor: number;
  mensagem: string;
  prazoResposta: string;
  status: 'PENDENTE' | 'ACEITA' | 'RECUSADA';
  propostaPaiId?: number | null;
  dataCriacao: string;
};

type CriarPropostaPayload = {
  servicoId: number;
  valor: number;
  mensagem: string;
  prazoResposta: string; // ISO
  dataInicio?: string | null;
  dataFim?: string | null;
};

@Component({
  selector: 'app-proposta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proposta.component.html',
  styleUrl: './proposta.component.css',
})
export class Proposta {
  // Serviço
  servicoId = signal(0);
  servicoTitulo = signal('');
  precoBase = signal(0);

  // Form
  valor = signal(0);
  mensagem = '';
  prazoResposta = ''; // yyyy-MM-ddTHH:mm
  dataInicio = '';    // yyyy-MM-dd
  dataFim = '';       // yyyy-MM-dd

  // Estado geral
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Histórico na mesma tela
  contratoId = signal<number | null>(null);
  propostas = signal<PropostaResponseDTO[]>([]);
  carregandoHistorico = signal(false);
  erroHistorico = signal('');

  // Modal Contraproposta
  showModal = signal(false);
  contrapropostaValor = signal<number | null>(null);
  contrapropostaMensagem = '';
  contrapropostaPrazo = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().substring(0, 16);
  propostaBaseIdParaContrapropor: number | null = null;
  erroModal = signal('');
  executandoAcao = signal(false);

  // Usuário atual (p/ decidir botões)
  usuarioIdAtual: number | null = Number(localStorage.getItem('userId') || 0) || null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private propostasApiService: PropostasApiService
  ) {
    // pega :id da rota
    this.servicoId.set(Number(this.route.snapshot.paramMap.get('id')));
    // Default: prazo em 7 dias
    this.prazoResposta = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 16);
    // Tenta receber contratoId via state (se veio de outro lugar)
    const stateContratoId = history.state?.contratoId as number | undefined;
    if (stateContratoId) this.contratoId.set(stateContratoId);

    this.carregarDadosServico();
    // Se já tem contratoId no state, carrega histórico ao abrir
    if (this.contratoId()) {
      this.carregarHistorico();
    }
  }

  private carregarDadosServico() {
    const servicoData = history.state?.servico;
    if (servicoData) {
      this.servicoTitulo.set(servicoData.titulo);
      this.precoBase.set(servicoData.precoBase);
      this.valor.set(servicoData.precoBase);
    }
  }

  private isFuture(isoOrDateStr: string): boolean {
    const d = new Date(isoOrDateStr);
    return d.getTime() > Date.now();
  }

  private toISODate(dateStr?: string | null): string | null {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T00:00');
    return d.toISOString();
  }

  async onSubmit() {
    this.errorMessage.set('');
    this.successMessage.set('');

    // Validações simples
    if (!this.valor() || this.valor() <= 0) {
      this.errorMessage.set('Informe um valor válido maior que 0.');
      return;
    }
    if (!this.prazoResposta || !this.isFuture(this.prazoResposta)) {
      this.errorMessage.set('Informe um prazo de resposta no futuro.');
      return;
    }
    if (this.dataInicio && this.dataFim) {
      const start = new Date(this.dataInicio);
      const end = new Date(this.dataFim);
      if (start.getTime() > end.getTime()) {
        this.errorMessage.set('A data de início não pode ser posterior à data de fim.');
        return;
      }
    }

    this.isSubmitting.set(true);

    try {
      const user = getUserFromToken() as any;
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }

      const payload: CriarPropostaPayload = {
        servicoId: this.servicoId(),
        valor: Number(this.valor().toFixed(2)),
        mensagem: this.mensagem || '',
        prazoResposta: new Date(this.prazoResposta).toISOString(),
        dataInicio: this.dataInicio ? this.toISODate(this.dataInicio) : null,
        dataFim: this.dataFim ? this.toISODate(this.dataFim) : null,
      };

      const response = await this.propostasApiService.criar(payload);
      if (response.status === 201 || response.status === 200) {
        const proposta = response.data as PropostaResponseDTO;
        const cid = proposta.contratoId;
        this.successMessage.set('Proposta enviada com sucesso!');

        // Se não tínhamos contratoId, agora passamos a exibir histórico na mesma tela
        if (cid && !this.contratoId()) {
          this.contratoId.set(cid);
          await this.carregarHistorico();
        } else if (cid) {
          // já tínhamos contratoId: apenas recarrega a lista
          await this.carregarHistorico();
        }
      }
    } catch (error: any) {
      this.errorMessage.set(error?.response?.data?.message || 'Não foi possível enviar sua proposta.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // ---------- Histórico e ações (na mesma tela) ----------
  async carregarHistorico() {
    const cid = this.contratoId();
    if (!cid) return;

    this.carregandoHistorico.set(true);
    this.erroHistorico.set('');
    try {
      const { data } = await this.propostasApiService.historico(cid);
      const lista = (data as PropostaResponseDTO[]) ?? [];
      this.propostas.set(lista);

      if (lista.length > 0) {
        const ordenadas = [...lista].sort(
          (a, b) => new Date(a.dataCriacao).getTime() - new Date(b.dataCriacao).getTime()
        );
        const ultima = ordenadas[ordenadas.length - 1];
        this.setFormFromProposta(ultima);
      }
    } catch (e: any) {
      this.erroHistorico.set(e?.response?.data?.message ?? 'Erro ao carregar histórico.');
    } finally {
      this.carregandoHistorico.set(false);
    }
  }


  podeAgir(p: PropostaResponseDTO) {
    return p.status === 'PENDENTE' && this.usuarioIdAtual && p.destinatarioId === this.usuarioIdAtual;
  }

  async aceitar(p: PropostaResponseDTO) {
    this.executandoAcao.set(true);
    try {
      await this.propostasApiService.aceitar(p.id);
      await this.carregarHistorico();
    } catch (e: any) {
      this.erroHistorico.set(e?.response?.data?.message ?? 'Erro ao aceitar.');
    } finally {
      this.executandoAcao.set(false);
    }
  }

  async recusar(p: PropostaResponseDTO) {
    this.executandoAcao.set(true);
    try {
      await this.propostasApiService.recusar(p.id);
      await this.carregarHistorico();
    } catch (e: any) {
      this.erroHistorico.set(e?.response?.data?.message ?? 'Erro ao recusar.');
    } finally {
      this.executandoAcao.set(false);
    }
  }
  
  abrirModalContrapropor(p: PropostaResponseDTO) {
    this.propostaBaseIdParaContrapropor = p.id;
    this.contrapropostaValor.set(p.valor || this.valor() || 0);
    this.contrapropostaMensagem = '';
    this.contrapropostaPrazo = this.toLocalInputDateTime(p.prazoResposta) || this.contrapropostaPrazo;
    this.erroModal.set('');
    this.showModal.set(true);
  }


  fecharModal() {
    this.showModal.set(false);
    this.propostaBaseIdParaContrapropor = null;
  }

  async enviarContraproposta() {
    if (!this.propostaBaseIdParaContrapropor) return;

    const valor = this.contrapropostaValor();
    if (!valor || valor <= 0) {
      this.erroModal.set('Informe um valor válido.');
      return;
    }

    this.executandoAcao.set(true);
    try {
      const payload: CriarPropostaPayload = {
        servicoId: this.servicoId(), // o backend vai validar com o contrato
        valor: Number(valor.toFixed(2)),
        mensagem: this.contrapropostaMensagem || '',
        prazoResposta: new Date(this.contrapropostaPrazo).toISOString(),
        dataInicio: null,
        dataFim: null,
      };

      await this.propostasApiService.contrapropor(this.propostaBaseIdParaContrapropor, payload);
      this.fecharModal();
      await this.carregarHistorico();
    } catch (e: any) {
      this.erroModal.set(e?.response?.data?.message ?? 'Erro ao enviar contraproposta.');
    } finally {
      this.executandoAcao.set(false);
    }
  }

  private toLocalInputDateTime(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    // monta no timezone local
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }
  
  private toLocalInputDate(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    return `${yyyy}-${mm}-${dd}`;
  }

  private setFormFromProposta(p: PropostaResponseDTO) {
    // Valor
    if (typeof p.valor === 'number' && p.valor > 0) {
      this.valor.set(p.valor);
      this.contrapropostaValor.set(p.valor); // modal default
    }

    // Mensagem (deixa opcional)
    this.mensagem = ''; // para nova proposta, mantém em branco por padrão
    this.contrapropostaMensagem = ''; // modal em branco

    // Prazo de resposta: usa o da última proposta como base, senão mantém +3d
    if (p.prazoResposta) {
      const local = this.toLocalInputDateTime(p.prazoResposta);
      this.prazoResposta = local || this.prazoResposta;
      this.contrapropostaPrazo = local || this.contrapropostaPrazo;
    }

    // Datas opcionais do contrato (se vieram na proposta)
    this.dataInicio = p.dataCriacao ? '' : this.dataInicio; // mantém atual se não houver
    // Se seu backend retorna dataInicio/dataFim dentro do DTO de proposta, mapeie aqui:
    // this.dataInicio = this.toLocalInputDate(p.dataInicio as any);
    // this.dataFim    = this.toLocalInputDate(p.dataFim as any);
    // Obs.: pelo DTO atual, não há essas propriedades; se decidir acrescentar, só descomentar.
  }


}