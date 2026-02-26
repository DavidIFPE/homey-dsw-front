import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import api from '../services/api';
import { getUserFromToken } from '../services/authService';

@Component({
  selector: 'app-criar-contrato',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './criar-contrato.component.html',
  styleUrl: './criar-contrato.component.css',
})
export class CriarContrato {
  servicoId: number;
  dataInicio = '';
  dataFim = '';
  valorFinal!: number;

  errorMessage = '';
  successMessage = '';
  isSubmitting = false;

  constructor(private route: ActivatedRoute, private router: Router) {
    this.servicoId = Number(this.route.snapshot.paramMap.get('id'));

    const user = getUserFromToken() as any;
    const tipo = user?.tipo || (Array.isArray(user?.roles) ? user.roles[0] : user?.roles);
    if (!user || !(tipo === 'CLIENTE' || tipo === 'cliente')) {
      this.router.navigate(['/login']);
    }
  }

  async onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.servicoId || !this.dataInicio || !this.dataFim || this.valorFinal == null) {
      this.errorMessage = 'Preencha todos os campos obrigatórios.';
      return;
    }

    this.isSubmitting = true;

    const payload = {
      servicoId: this.servicoId,
      dataInicio: this.dataInicio,
      dataFim: this.dataFim,
      valorFinal: this.valorFinal,
    };

    try {
      const response = await api.post('/contratos', payload);
      if (response.status === 201 || response.status === 200) {
        this.successMessage = 'Proposta enviada com sucesso!';
        setTimeout(() => {
          this.router.navigate(['/servicos']);
        }, 1500);
      }
    } catch (error: any) {
      console.error('[CriarContrato] Erro ao criar contrato', error);
      this.errorMessage =
        error?.response?.data?.message || 'Não foi possível enviar sua proposta.';
    } finally {
      this.isSubmitting = false;
    }
  }
}
