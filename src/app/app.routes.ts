
import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Servico } from './servico/servico';
import { CriarServico } from './criar-servico/criar-servico';
import { PrestadorProfile } from './prestador-profile/prestador-profile';
import { RegistroPrestador } from './registro-prestador/registro-prestador';
import { RegistroCliente } from './registro-cliente/registro-cliente';
import { LandingHome } from './landing-home/landing-home.component';
import { PrestadorContratos } from './prestador-contratos/prestador-contratos';
import { CriarContrato } from './criar-contrato/criar-contrato';
import { Proposta } from './proposta/proposta';
import { HistoricoPropostas } from './historico-propostas/historico-propostas';

export const routes: Routes = [
	{ path: '', component: LandingHome, pathMatch: 'full' },
	{ path: 'login', component: Login },
	{ path: 'servicos', component: Servico },
	{ path: 'servicos/novo', component: CriarServico },
	{ path: 'servicos/:id/proposta', component: Proposta },
	{ path: 'prestador/:id', component: PrestadorProfile },
	{ path: 'registro-prestador', component: RegistroPrestador },
	{ path: 'registro-cliente', component: RegistroCliente },
	{ path: 'contratos', component: PrestadorContratos },
	{ path: 'contratos/:contratoId/propostas', component: HistoricoPropostas },
];
