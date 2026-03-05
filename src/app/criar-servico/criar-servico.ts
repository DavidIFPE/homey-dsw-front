import { ChangeDetectorRef, Component, NgZone } from "@angular/core";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import api from "../services/api";
import axios from "axios";

interface EnderecoDTO {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    latitude: number;
    longitude: number;
}

interface CriarServicoDTO {
    titulo: string;
    descricao?: string;
    precoBase: number;
    disponivel: boolean;
    categorias: string[];
    endereco: EnderecoDTO;
}

@Component({
    selector: 'app-servicos',
    templateUrl: './criar-servico.component.html',
    imports: [CommonModule, FormsModule],
    styleUrl: './criar-servico.css'
})
export class CriarServico {
    titulo = '';
    descricao = '';
    precoBase!: number;
    disponivel = true;
    categoriasTexto = '';
    erro?: string;
    buscandoCoordenadas = false;
    buscandoCEP = false;

    // Endereço do serviço
    logradouro = '';
    numero = '';
    complemento = '';
    bairro = '';
    cidade = '';
    estado = '';
    cep = '';
    latitude!: number;
    longitude!: number;

    constructor(private Firouter: Router, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

    async buscarEnderecoPorCEP() {
        this.erro = undefined;
        
        if (!this.cep) {
            this.erro = "Informe um CEP para buscar o endereço.";
            return;
        }

        this.buscandoCEP = true;
        const cepLimpo = this.cep.replace(/\D/g, "");

        try {
            // Usar API ViaCEP (Correios) para buscar endereço
            const response = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            
            if (response.data.erro) {
                this.erro = "CEP não encontrado nos Correios.";
                this.buscandoCEP = false;
                this.cdr.detectChanges();
                return;
            }

            this.ngZone.run(() => {
                // Preencher dados automaticamente
                this.logradouro = response.data.logradouro || '';
                this.bairro = response.data.bairro || '';
                this.cidade = response.data.localidade || '';
                this.estado = response.data.uf || '';
                this.cdr.detectChanges();
            });
        } catch (error: any) {
            this.erro = "Erro ao buscar CEP nos Correios. Verifique a conexão.";
        } finally {
            this.buscandoCEP = false;
            this.cdr.detectChanges();
        }
    }

    buscarCoordenadas() {
        this.erro = undefined;

        if (!this.cep && !(this.logradouro && this.cidade && this.estado)) {
            this.erro = "Informe o CEP ou logradouro, cidade e estado para buscar as coordenadas.";
            return;
        }

        console.log('[CriarServico] Iniciando busca de coordenadas');
        this.buscandoCoordenadas = true;

        let request;

        if (this.cep) {
            const cepLimpo = this.cep.replace(/\D/g, "");
            request = api.get('/enderecos/coordenadas/cep', {
                params: { cep: cepLimpo }
            });
        } else {
            request = api.get('/enderecos/coordenadas', {
                params: {
                    rua: this.logradouro,
                    numero: this.numero,
                    bairro: this.bairro,
                    cidade: this.cidade,
                    estado: this.estado
                }
            });
        }

        request
            .then((response) => {
                this.ngZone.run(() => {
                    console.log('[CriarServico] Resposta coordenadas', response.data);
                    const data = response.data ?? {};

                    const latitude = (data as any).latitude ?? (data as any).coordenadas?.latitude ?? (data as any).endereco?.latitude;
                    const longitude = (data as any).longitude ?? (data as any).coordenadas?.longitude ?? (data as any).endereco?.longitude;
                    const logradouro = (data as any).logradouro ?? (data as any).endereco?.logradouro;
                    const bairro = (data as any).bairro ?? (data as any).endereco?.bairro;
                    const cidade = (data as any).cidade ?? (data as any).endereco?.cidade;
                    const estado = (data as any).estado ?? (data as any).endereco?.estado;
                    
                    if (latitude == null || longitude == null || bairro == null || cidade == null || estado == null) {
                        this.erro = "Coordenadas não encontradas na resposta do servidor.";
                        this.cdr.detectChanges();
                        return;
                    }

                    this.latitude = latitude;
                    this.longitude = longitude;
                    this.logradouro = logradouro || this.logradouro;
                    this.bairro = bairro || this.bairro;
                    this.cidade = cidade || this.cidade;
                    this.estado = estado || this.estado;
                    this.cdr.detectChanges();
                });
            })
            .catch((error: any) => {
                this.ngZone.run(() => {
                    console.error('[CriarServico] Erro ao buscar coordenadas', error);
                    this.erro = error?.response?.data ?? "Não foi possível buscar as coordenadas do endereço.";
                    this.cdr.detectChanges();
                });
            })
            .finally(() => {
                this.ngZone.run(() => {
                    console.log('[CriarServico] Finalizou busca de coordenadas');
                    this.buscandoCoordenadas = false;
                    this.cdr.detectChanges();
                });
            });
    }

    async criarServico() {
        if (this.latitude == null || this.longitude == null) {
            this.erro = "Busque as coordenadas do endereço antes de criar o serviço.";
            return;
        }

        const payload: CriarServicoDTO = {
            titulo: this.titulo,
            descricao: this.descricao,
            precoBase: this.precoBase,
            disponivel: this.disponivel,
            categorias: this.categoriasTexto ? this.categoriasTexto.split(',').map(c => c.trim()) : [],
            endereco: {
                logradouro: this.logradouro || undefined,
                numero: this.numero || undefined,
                complemento: this.complemento || undefined,
                bairro: this.bairro || undefined,
                cidade: this.cidade || undefined,
                estado: this.estado || undefined,
                cep: this.cep || undefined,
                latitude: this.latitude,
                longitude: this.longitude
            }
        }

        try {
            await api.post('/servicos', payload)

            this.Firouter.navigate(['/servicos']);
        } catch (error: any) {
            this.erro = error?.response?.data ?? "Erro ao criar o serviço!";
        }
    }
}