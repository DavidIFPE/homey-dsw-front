import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import api from '../services/api';

@Component({
  selector: 'app-registro-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registro-cliente.component.html',
  styleUrl: './registro-cliente.component.css'
})
export class RegistroCliente {
  nome = '';
  email = '';
  username = '';
  senha = '';
  dataNascimento = '';
  telefone = '';
  cpf = '';

  // Endereço do cliente
  logradouro = '';
  numero = '';
  complemento = '';
  bairro = '';
  cidade = '';
  estado = '';
  cep = '';
  latitude!: number;
  longitude!: number;

  isSubmitting = false;
  buscandoCoordenadas = false;
  successMessage = '';
  errorMessage = '';

  constructor(private router: Router) {}

  async buscarCoordenadas() {
    this.errorMessage = '';

    if (!this.cep && !(this.logradouro && this.cidade && this.estado)) {
      this.errorMessage =
        'Informe o CEP ou logradouro, cidade e estado para buscar as coordenadas.';
      return;
    }

    this.buscandoCoordenadas = true;

    try {
      let response;

      if (this.cep) {
        const cepLimpo = this.cep.replace(/\D/g, '');
        response = await api.get('/enderecos/coordenadas/cep', {
          params: { cep: cepLimpo }
        });
      } else {
        response = await api.get('/enderecos/coordenadas', {
          params: {
            rua: this.logradouro,
            numero: this.numero,
            bairro: this.bairro,
            cidade: this.cidade,
            estado: this.estado
          }
        });
      }

      const data = response.data ?? {};

      const latitude = (data as any).latitude ?? (data as any).coordenadas?.latitude ?? (data as any).endereco?.latitude;
      const longitude = (data as any).longitude ?? (data as any).coordenadas?.longitude ?? (data as any).endereco?.longitude;
      const logradouro = (data as any).logradouro ?? (data as any).endereco?.logradouro;
      const bairro = (data as any).bairro ?? (data as any).endereco?.bairro;
      const cidade = (data as any).cidade ?? (data as any).endereco?.cidade;
      const estado = (data as any).estado ?? (data as any).endereco?.estado;

      if (latitude == null || longitude == null || bairro == null || cidade == null || estado == null) {
        this.errorMessage = 'Coordenadas não encontradas na resposta do servidor.';
        return;
      }

      this.latitude = latitude;
      this.longitude = longitude;
      this.logradouro = logradouro || this.logradouro;
      this.bairro = bairro || this.bairro;
      this.cidade = cidade || this.cidade;
      this.estado = estado || this.estado;
    } catch (error: any) {
      console.error('[RegistroCliente] Erro ao buscar coordenadas', error);
      this.errorMessage =
        error?.response?.data ??
        'Não foi possível buscar as coordenadas do endereço.';
    } finally {
      this.buscandoCoordenadas = false;
    }
  }

  async onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.latitude == null || this.longitude == null) {
      this.errorMessage =
        'Busque as coordenadas do endereço antes de finalizar o cadastro.';
      return;
    }

    const payload = {
      nome: this.nome,
      email: this.email,
      username: this.username,
      senha: this.senha,
      dataNascimento: this.dataNascimento,
      telefone: this.telefone,
      cpf: this.cpf,
      endereco: {
        logradouro: this.logradouro,
        numero: this.numero,
        complemento: this.complemento,
        bairro: this.bairro,
        cidade: this.cidade,
        estado: this.estado,
        cep: this.cep,
        latitude: this.latitude,
        longitude: this.longitude
      }
    };

    this.isSubmitting = true;

    try {
      const response = await api.post('/usuario/cliente', payload);

      if (response.status === 201 || response.status === 200) {
        this.successMessage = 'Cadastro realizado com sucesso!';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      }
    } catch (error: any) {
      this.errorMessage =
        error?.response?.data?.message ||
        'Erro ao realizar cadastro. Verifique os dados e tente novamente.';
    } finally {
      this.isSubmitting = false;
    }
  }
}
