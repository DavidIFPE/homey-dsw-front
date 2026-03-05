// src/app/propostas/propostas-api.service.ts
import { Injectable } from '@angular/core';
import api from './api';

export type CriarPropostaPayload = {
  servicoId: number;
  valor: number;
  mensagem: string;
  prazoResposta: string; // ISO
  dataInicio?: string | null; // ISO (ou null)
  dataFim?: string | null;    // ISO (ou null)
};

@Injectable({ providedIn: 'root' })
export class PropostasApiService {
  criar(payload: CriarPropostaPayload) {
    return api.post('/propostas', payload);
  }

  historico(contratoId: number) {
    return api.get(`/propostas/contrato/${contratoId}`);
  }

  aceitar(propostaId: number) {
    return api.post(`/propostas/${propostaId}/aceitar`, {});
  }

  recusar(propostaId: number) {
    return api.post(`/propostas/${propostaId}/recusar`, {});
  }

  contrapropor(contratoId: number, payload: CriarPropostaPayload) {
    return api.post(`/propostas/${contratoId}/contrapropor`, payload);
  }
}