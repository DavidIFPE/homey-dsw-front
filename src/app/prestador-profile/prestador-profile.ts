import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import api from '../services/api';

interface EnderecoDTO {
  id: number;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  latitude: number;
  longitude: number;
}

interface PrestadorResponseDTO {
  id: number;
  nome: string;
  email: string;
  username: string;
  dataNascimento: Date;
  telefone: string;
  tipo: string;
  cpf: string | null;
  cpfCnpj: string;
  resumo: string | null;
  avaliacao: number | null;
  dataCriacao: Date;
  endereco: EnderecoDTO | null;
}

interface ContratoResumoDTO {
  id: number;
  valorFinal: number;
  status: string;
  dataInicio?: string;
  dataFim?: string;
}

@Component({
  selector: 'app-prestador-profile',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './prestador-profile.component.html',
  styleUrl: './prestador-profile.css',
})
export class PrestadorProfile implements OnInit {
  prestadorId: number;
  prestador = signal<PrestadorResponseDTO | null>(null);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  contratos = signal<ContratoResumoDTO[]>([]);
  contratosLoading = signal(false);
  contratosError = signal<string | null>(null);

  contratosTotal = signal(0);
  contratosTotalGanho = signal(0);
  contratosMediaGanho = signal(0);
  contratosAtivos = signal(0);
  contratosConcluidos = signal(0);
  contratosCancelados = signal(0);

  // Configurações dos gráficos
  statusChartData: ChartData<'doughnut'> = {
    labels: ['Ativos', 'Concluídos', 'Cancelados'],
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: ['#3b82f6', '#22c55e', '#ef4444'],
        borderWidth: 1,
      },
    ],
  };

  statusChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
    maintainAspectRatio: false,
  };

  revenueChartData: ChartData<'bar'> = {
    labels: ['Total ganho', 'Média por contrato'],
    datasets: [
      {
        data: [0, 0],
        backgroundColor: ['#22c55e', '#3b82f6'],
      },
    ],
  };

  revenueChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    maintainAspectRatio: false,
  };
  // Faturamento por período (mês)
  monthlyRevenueChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Faturamento por mês',
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  monthlyRevenueChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
    maintainAspectRatio: false,
  };

  // Quantidade de contratos fechados (concluídos) por mês
  closedContractsCountChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Contratos concluídos por mês',
        backgroundColor: '#3b82f6',
      },
    ],
  };

  closedContractsCountChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
    scales: {
      y: {
        ticks: {
          stepSize: 1,
        },
      },
    },
    maintainAspectRatio: false,
  };

  constructor(private route: ActivatedRoute) {
    this.prestadorId = Number(this.route.snapshot.paramMap.get('id'));
  }

  async ngOnInit() {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const response = await api.get<PrestadorResponseDTO>(`/usuario/prestador/${this.prestadorId}`);
      this.prestador.set(response.data);

      await this.carregarContratosResumo();
    } catch (error: any) {
      console.error('Erro ao carregar perfil do prestador', error);
      this.prestador.set(null);
      if (error?.response?.status === 404) {
        this.errorMessage.set('Prestador não encontrado.');
      } else if (error?.response?.status === 401) {
        this.errorMessage.set('Acesso não autorizado. Faça login novamente.');
      } else {
        this.errorMessage.set('Não foi possível carregar o perfil do prestador.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async carregarContratosResumo() {
    this.contratosLoading.set(true);
    this.contratosError.set(null);

    try {
      const response = await api.get<ContratoResumoDTO[]>(`/contratos/prestador/${this.prestadorId}`);
      const lista = (response.data || []) as any[] as ContratoResumoDTO[];

      this.contratos.set(lista);

      const total = lista.length;
      let totalGanho = 0;
      let concluidos = 0;
      let ativos = 0;
      let cancelados = 0;
      const faturamentoPorMes = new Map<
        string,
        {
          label: string;
          total: number;
        }
      >();

      const contratosConcluidosPorMes = new Map<
        string,
        {
          label: string;
          count: number;
        }
      >();

      for (const c of lista) {
        const status = (c.status || '').toUpperCase();
        if (status === 'CONCLUIDO') {
          concluidos++;
          totalGanho += c.valorFinal || 0;

          const dateString = c.dataFim || c.dataInicio;
          if (dateString) {
            const date = new Date(dateString);
            if (!Number.isNaN(date.getTime())) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const key = `${year}-${month}`;
              const label = `${month}/${year}`;

              const countEntry = contratosConcluidosPorMes.get(key) ?? {
                label,
                count: 0,
              };
              countEntry.count += 1;
              contratosConcluidosPorMes.set(key, countEntry);

              if (c.valorFinal) {
                const existing = faturamentoPorMes.get(key) ?? {
                  label,
                  total: 0,
                };
                existing.total += c.valorFinal || 0;
                faturamentoPorMes.set(key, existing);
              }
            }
          }
        } else if (status === 'ATIVO') {
          ativos++;
        } else if (status === 'CANCELADO') {
          cancelados++;
        }
      }

      this.contratosTotal.set(total);
      this.contratosTotalGanho.set(totalGanho);
      this.contratosAtivos.set(ativos);
      this.contratosConcluidos.set(concluidos);
      this.contratosCancelados.set(cancelados);
      this.contratosMediaGanho.set(concluidos > 0 ? totalGanho / concluidos : 0);

      // Atualiza dados dos gráficos
      this.statusChartData = {
        ...this.statusChartData,
        datasets: [
          {
            ...this.statusChartData.datasets[0],
            data: [ativos, concluidos, cancelados],
          },
        ],
      };

      this.revenueChartData = {
        ...this.revenueChartData,
        datasets: [
          {
            ...this.revenueChartData.datasets[0],
            data: [totalGanho, concluidos > 0 ? totalGanho / concluidos : 0],
          },
        ],
      };

      // Atualiza gráficos mensais (faturamento e quantidade de contratos concluídos)
      const sortedMonths = Array.from(contratosConcluidosPorMes.entries()).sort(([a], [b]) =>
        a.localeCompare(b),
      );

      const monthLabels = sortedMonths.map(([, value]) => value.label);
      const revenueValues = sortedMonths.map(([key]) => faturamentoPorMes.get(key)?.total ?? 0);
      const closedContractsValues = sortedMonths.map(([, value]) => value.count);

      this.monthlyRevenueChartData = {
        ...this.monthlyRevenueChartData,
        labels: monthLabels,
        datasets: [
          {
            ...this.monthlyRevenueChartData.datasets[0],
            data: revenueValues,
          },
        ],
      };

      this.closedContractsCountChartData = {
        ...this.closedContractsCountChartData,
        labels: monthLabels,
        datasets: [
          {
            ...this.closedContractsCountChartData.datasets[0],
            data: closedContractsValues,
          },
        ],
      };
    } catch (error: any) {
      console.error('Erro ao carregar resumo de contratos do prestador', error);
      this.contratosError.set('Não foi possível carregar o resumo de contratos.');
    } finally {
      this.contratosLoading.set(false);
    }
  }

  private onlyDigits(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    return value.replace(/\D/g, '');
  }

  formatTelefone(telefone: string | null | undefined): string {
    const digits = this.onlyDigits(telefone);
    if (digits.length === 10) {
      // (81) 3888-0000
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11) {
      // (81) 98888-0000
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return telefone ?? '';
  }

  formatCpfCnpj(valor: string | null | undefined): string {
    const digits = this.onlyDigits(valor);
    if (digits.length === 11) {
      // CPF: 000.000.000-00
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 14) {
      // CNPJ: 00.000.000/0000-00
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    }
    return valor ?? '';
  }

  formatCep(cep: string | null | undefined): string {
    const digits = this.onlyDigits(cep);
    if (digits.length === 8) {
      // CEP: 00000-000
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return cep ?? '';
  }
}
