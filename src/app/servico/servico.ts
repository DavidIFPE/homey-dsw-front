import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import api from "../services/api";
import { getUserFromToken } from "../services/authService";

interface CategoriaResponseDTO {
    id: number;
    nome: string;
}

interface ServicoResponseDTO {
    id: number;
    titulo: string;
    descricao: string;
    precoBase: number;
    disponivel: boolean;
    prestadorId: number;
    prestadorNome: string;
    categorias?: CategoriaResponseDTO[];
    dataCriacao: string;
    distanciaKm?: number; // Distância em km, opcional para serviços próximos
}

@Component({
    selector: 'app-servicos',
    templateUrl: './servico.component.html',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    styleUrl: './servico.css'
})
export class Servico implements OnInit {
    servicos = signal<ServicoResponseDTO[]>([]);
    categorias = signal<CategoriaResponseDTO[]>([]);
    cepPesquisa: string = "";
    categoriaSelecionada: string = "";
    carregando = signal(false);
    erro = signal<string | null>(null);
    isCliente = signal(false);

    async ngOnInit() {
        const user = getUserFromToken() as any;
        const tipo = user?.tipo || (Array.isArray(user?.roles) ? user.roles[0] : user?.roles);
        this.isCliente.set(tipo === 'CLIENTE' || tipo === 'cliente');

        await this.carregarServicos()
    }

    async carregarServicos() {
        try {
            this.carregando.set(true);
            this.erro.set(null);

            const response = await api.get<ServicoResponseDTO[]>('/servicos');
            this.servicos.set(response.data as any);
            this.atualizarCategoriasDisponiveis();
            console.log('Resposta /servicos:', response.data);
            console.log('Servicos no componente:', this.servicos());
        } catch (err) {
            console.error('Erro ao carregar serviços', err);
            this.erro.set('Erro ao carregar serviços.');
        } finally {
            this.carregando.set(false);
        }
    }

    private atualizarCategoriasDisponiveis() {
        const mapa = new Map<number, CategoriaResponseDTO>();

        for (const servico of this.servicos() || []) {
            if (servico.categorias) {
                for (const categoria of servico.categorias) {
                    if (!mapa.has(categoria.id)) {
                        mapa.set(categoria.id, categoria);
                    }
                }
            }
        }

        this.categorias.set(Array.from(mapa.values()));
    }

    async buscarServicosProximos() {
        if (!this.cepPesquisa) {
            return;
        }

        try {
            this.carregando.set(true);
            this.erro.set(null);

            const params: any = { cep: this.cepPesquisa };
            if (this.categoriaSelecionada) {
                params.categoria = this.categoriaSelecionada;
            }

            const response = await api.get<ServicoResponseDTO[]>('/servicos/proximos', { params });

            this.servicos.set(response.data as any);
            console.log('Resposta /servicos/proximos:', response.data);
        } catch (err) {
            console.error('Erro ao buscar serviços por CEP', err);
            this.erro.set('Erro ao buscar serviços para o CEP informado.');
        } finally {
            this.carregando.set(false);
        }
    }

    async buscarPorCategoria() {
        if (!this.categoriaSelecionada) {
            return;
        }

        try {
            this.carregando.set(true);
            this.erro.set(null);

            const response = await api.get<ServicoResponseDTO[]>('/servicos/por-categoria', {
                params: { categoria: this.categoriaSelecionada }
            });

            this.servicos.set(response.data as any);
            console.log('Resposta /servicos/por-categoria:', response.data);
        } catch (err) {
            console.error('Erro ao buscar serviços por categoria', err);
            this.erro.set('Erro ao buscar serviços para a categoria informada.');
        } finally {
            this.carregando.set(false);
        }
    }

}
  