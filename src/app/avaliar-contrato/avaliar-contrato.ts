import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import api from '../services/api';
import { getUserFromToken } from '../services/authService';

interface ContratoAvaliacaoDTO {
  id: number;
  servicoTitulo?: string;
  prestadorNome?: string;
  dataFim: string;
  valorFinal: number;
  status: string;
}

interface AvaliacaoExistenteDTO {
  id: number;
  nota: number;
  comentario: string;
  fotoUrl: string;
  contratoId: number;
  clienteId: number;
  clienteNome: string;
  servicoId: number;
  servicoTitulo: string;
  prestadorId: number;
  prestadorNome: string;
  dataCriacao: string;
}

interface AvaliacaoRequest {
  nota: number;
  comentario: string;
  contratoId: number;
}

@Component({
  selector: 'app-avaliar-contrato',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './avaliar-contrato.component.html',
  styleUrl: './avaliar-contrato.component.css',
})
export class AvaliarContrato implements OnInit {
  contratoId: number = 0;
  contrato = signal<ContratoAvaliacaoDTO | null>(null);
  avaliacaoExistente = signal<AvaliacaoExistenteDTO | null>(null);
  loading = signal(false);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  modoVisualizacao = signal(false);

  // Formulário de avaliação
  nota = signal(5);
  comentario = signal('');
  fotos = signal<File[]>([]);
  previewUrls = signal<string[]>([]);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  async ngOnInit() {
    const user = getUserFromToken() as any;
    const tipo = user?.tipo;

    if (!tipo || (tipo !== 'CLIENTE' && tipo !== 'cliente')) {
      this.router.navigate(['/']);
      return;
    }

    this.contratoId = Number(this.route.snapshot.paramMap.get('id'));
    await this.carregarContrato();
  }

  async carregarContrato() {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const response = await api.get<ContratoAvaliacaoDTO>(`/contratos/${this.contratoId}`);
      this.contrato.set(response.data);

      // Verifica se o contrato é elegível para avaliação
      if (response.data.status?.toUpperCase() !== 'CONCLUIDO') {
        this.errorMessage.set('Este contrato não foi concluído e não pode ser avaliado.');
      } else {
        // Tenta carregar avaliação existente
        await this.carregarAvaliacaoExistente();
      }
    } catch (error: any) {
      console.error('[AvaliarContrato] Erro ao carregar contrato', error);
      this.errorMessage.set('Não foi possível carregar o contrato.');
    } finally {
      this.loading.set(false);
    }
  }

  async carregarAvaliacaoExistente() {
    try {
      const response = await api.get<AvaliacaoExistenteDTO>(`/avaliacoes/contrato/${this.contratoId}`);
      console.log('[AvaliarContrato] Avaliação carregada:', response.data);
      console.log('[AvaliarContrato] fotoUrl =', response.data.fotoUrl);
      console.log('[AvaliarContrato] nota =', response.data.nota);
      console.log('[AvaliarContrato] comentario =', response.data.comentario);
      console.log('[AvaliarContrato] dataCriacao =', response.data.dataCriacao);
      
      this.avaliacaoExistente.set(response.data);
      this.modoVisualizacao.set(true);
      
      // Preencher formulário com dados existentes (se quiser permitir edição)
      this.nota.set(response.data.nota);
      this.comentario.set(response.data.comentario);
    } catch (error: any) {
      console.log('[AvaliarContrato] Avaliação não existe ou erro ao carregar:', error?.response?.status);
      // Avaliação não existe ainda, modo edição ativo
      this.avaliacaoExistente.set(null);
      this.modoVisualizacao.set(false);
    }
  }

  gerarUrlFoto(fotoUrl: string | null): string {
    if (!fotoUrl) return '';
    // Se já tiver http, retorna como está
    if (fotoUrl.startsWith('http')) return fotoUrl;
    // Caso contrário, concatena com baseURL
    return 'http://localhost:8080' + fotoUrl;
  }

  onFotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const arquivo = input.files[0]; // Apenas primeira foto

    // Validar tipo de arquivo
    if (!arquivo.type.startsWith('image/')) {
      this.errorMessage.set('Apenas arquivos de imagem são permitidos.');
      return;
    }
    
    // Validar tamanho (5MB)
    if (arquivo.size > 5 * 1024 * 1024) {
      this.errorMessage.set('Tamanho máximo de 5MB por foto.');
      return;
    }

    this.fotos.set([arquivo]);
    this.gerarPreviews();
    
    // Limpar input
    input.value = '';
  }

  gerarPreviews() {
    if (this.fotos().length === 0) {
      this.previewUrls.set([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        this.previewUrls.set([e.target.result as string]);
      }
    };
    reader.readAsDataURL(this.fotos()[0]);
  }

  removerFoto() {
    this.fotos.set([]);
    this.previewUrls.set([]);
  }

  async onSubmit() {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    // Validações
    if (this.nota() < 1 || this.nota() > 5) {
      this.errorMessage.set('A nota deve estar entre 1 e 5 estrelas.');
      return;
    }

    if (!this.comentario().trim()) {
      this.errorMessage.set('Por favor, escreva um comentário sobre o serviço.');
      return;
    }

    this.submitting.set(true);

    // Debug: verificar token antes de enviar
    const token = localStorage.getItem('token');
    console.log('[AvaliarContrato] Token no localStorage:', token ? 'PRESENTE' : 'AUSENTE');
    if (token) {
      console.log('[AvaliarContrato] Token length:', token.length);
    }

    try {
      // Criar FormData conforme padrão do upload de perfil
      const formData = new FormData();
      
      // Adicionar avaliação como FormData (não como Blob)
      formData.append('contratoId', this.contratoId.toString());
      formData.append('nota', this.nota().toString());
      formData.append('comentario', this.comentario().trim());

      // Adicionar foto se existir
      if (this.fotos().length > 0) {
        console.log('[AvaliarContrato] Enviando foto:', this.fotos()[0].name, this.fotos()[0].size);
        formData.append('foto', this.fotos()[0]);
      } else {
        console.log('[AvaliarContrato] Nenhuma foto para enviar');
      }

      // NÃO especificar Content-Type - Axios/navegador cuida automaticamente
      console.log('[AvaliarContrato] Enviando FormData para POST /avaliacoes');
      const response = await api.post('/avaliacoes', formData);

      if (response.status === 201 || response.status === 200) {
        this.successMessage.set('Avaliação enviada com sucesso!');
        setTimeout(() => {
          this.router.navigate(['/meus-contratos']);
        }, 1500);
      }
    } catch (error: any) {
      console.error('[AvaliarContrato] Erro ao enviar avaliação', error);
      this.errorMessage.set(
        error?.response?.data?.message || 'Erro ao enviar avaliação.'
      );
    } finally {
      this.submitting.set(false);
    }
  }

  voltar() {
    this.router.navigate(['/meus-contratos']);
  }

  gerarEstrelasArray(nota: number): number[] {
    return Array.from({ length: nota }, (_, i) => i + 1);
  }

  gerarEstrelasVazias(nota: number): number[] {
    return Array.from({ length: 5 - nota }, (_, i) => nota + i + 1);
  }

  onImageError(event: Event) {
    console.error('[AvaliarContrato] Erro ao carregar imagem', event);
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      const msg = document.createElement('p');
      msg.className = 'avaliar-contrato-visualizacao__sem-foto';
      msg.textContent = 'Erro ao carregar a foto';
      parent.appendChild(msg);
    }
  }
}