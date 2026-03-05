import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import api from '../services/api';

interface UsuarioResponse {
  id: number;
  nome: string;
  email: string;
  username: string;
  dataNascimento: string;
  telefone: string;
  tipo: string;
  cpf?: string | null;
  cpfCnpj?: string | null;
  resumo?: string | null;
  avaliacao?: number | null;
  dataCriacao: string;
  fotoUrl?: string | null;
}

interface UsuarioDTO {
  id: number;
  nome: string;
  email: string;
  username: string;
  telefone: string;
  dataNascimento: string;
  tipo: string;
  cpfCnpj: string;
  fotoPerfil?: string;
  fotoPerfilUrl?: string | null;
  resumo?: string;
  dataCriacao: string;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.css',
})
export class UserProfileComponent implements OnInit {
  usuario = signal<UsuarioDTO | null>(null);
  loading = signal(false);
  uploadingPhoto = signal(false);
  editingMode = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  
  photoPreview = signal<string | null>(null);
  selectedFile = signal<File | null>(null);

  profileForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.initializeForm();
    this.carregarUsuario();
  }

  private initializeForm() {
    this.profileForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      telefone: ['', [Validators.required, Validators.minLength(10)]],
      dataNascimento: ['', Validators.required],
      resumo: ['', Validators.maxLength(500)],
    });
  }

  private async carregarUsuario() {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const response = await api.get<UsuarioResponse>('/autenticacao/me');
      const usuarioData = response.data;
      
      // Mapear dados da resposta para UsuarioDTO
      const usuario: UsuarioDTO = {
        id: usuarioData.id,
        nome: usuarioData.nome,
        email: usuarioData.email,
        username: usuarioData.username,
        telefone: usuarioData.telefone,
        dataNascimento: usuarioData.dataNascimento,
        tipo: usuarioData.tipo,
        cpfCnpj: usuarioData.cpfCnpj || usuarioData.cpf || '', // Usar cpfCnpj ou cpf, o que estiver disponível
        resumo: usuarioData.resumo || '',
        dataCriacao: usuarioData.dataCriacao,
        fotoPerfilUrl: this.buildAbsoluteImageUrl(usuarioData.fotoUrl), // Converter URL relativa em absoluta
      };

      this.usuario.set(usuario);
      this.photoPreview.set(this.buildAbsoluteImageUrl(usuarioData.fotoUrl));

      this.profileForm.patchValue({
        nome: usuario.nome,
        email: usuario.email,
        username: usuario.username,
        telefone: usuario.telefone,
        dataNascimento: this.formatarDataParaInput(usuario.dataNascimento),
        resumo: usuario.resumo || '',
      });
    } catch (error: any) {
      if (error?.response?.status === 401) {
        this.errorMessage.set('Acesso não autorizado. Faça login novamente.');
      } else {
        this.errorMessage.set('Não foi possível carregar seu perfil.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  private formatarDataParaInput(data: string): string {
    if (!data) return '';
    const date = new Date(data);
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        this.errorMessage.set('Por favor, selecione uma imagem válida.');
        return;
      }

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage.set('A imagem não pode ter mais de 5MB.');
        return;
      }

      this.selectedFile.set(file);
      this.errorMessage.set(null);

      // Criar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async uploadFotoPerfil() {
    const file = this.selectedFile();
    if (!file) {
      this.errorMessage.set('Nenhuma imagem selecionada.');
      return;
    }

    this.uploadingPhoto.set(true);
    this.errorMessage.set(null);

    try {
      const formData = new FormData();
      formData.append('foto', file); // Mudado de 'arquivo' para 'foto'

      const response = await api.post<{ fotoUrl: string }>(
        '/usuario/foto',
        formData
        // NÃO especificar Content-Type - Axios cuida automaticamente
      );

      const absoluteImageUrl = this.buildAbsoluteImageUrl(response.data.fotoUrl);
      if (this.usuario()) {
        this.usuario()!.fotoPerfilUrl = absoluteImageUrl; // Mapear fotoUrl para fotoPerfilUrl
      }
      this.photoPreview.set(absoluteImageUrl); // Atualizar preview também

      this.selectedFile.set(null);
      this.successMessage.set('Foto de perfil atualizada com sucesso!');
      this.limparMensagens();
    } catch (error: any) {
      this.errorMessage.set('Erro ao fazer upload da foto. Tente novamente.');
    } finally {
      this.uploadingPhoto.set(false);
    }
  }

  cancelarUpload() {
    const usuarioAtual = this.usuario();
    if (usuarioAtual?.fotoPerfilUrl) {
      this.photoPreview.set(usuarioAtual.fotoPerfilUrl);
    } else {
      this.photoPreview.set(null);
    }
    this.selectedFile.set(null);
  }

  async salvarPerfil() {
    if (this.profileForm.invalid) {
      this.errorMessage.set('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const dadosAtualizados = this.profileForm.value;

      const response = await api.put<UsuarioDTO>(
        '/usuario/atualizar-perfil',
        dadosAtualizados
      );

      this.usuario.set(response.data);
      this.editingMode.set(false);
      this.successMessage.set('Perfil atualizado com sucesso!');
      this.limparMensagens();
    } catch (error: any) {
      if (error?.response?.status === 400) {
        this.errorMessage.set('Dados inválidos. Verifique os campos.');
      } else {
        this.errorMessage.set('Erro ao atualizar perfil. Tente novamente.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  cancelarEdicao() {
    this.editingMode.set(false);
    const usuarioAtual = this.usuario();
    if (usuarioAtual) {
      this.profileForm.patchValue({
        nome: usuarioAtual.nome,
        email: usuarioAtual.email,
        username: usuarioAtual.username,
        telefone: usuarioAtual.telefone,
        dataNascimento: this.formatarDataParaInput(usuarioAtual.dataNascimento),
        resumo: usuarioAtual.resumo || '',
      });
    }
  }

  iniciarEdicao() {
    this.editingMode.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  private limparMensagens() {
    setTimeout(() => {
      this.successMessage.set(null);
      this.errorMessage.set(null);
    }, 3000);
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

  obterAcronimo(nome: string): string {
    return nome
      .split(' ')
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  private buildAbsoluteImageUrl(fotoUrl: string | null | undefined): string | null {
    if (!fotoUrl) {
      return null;
    }
    if (fotoUrl.startsWith('http://') || fotoUrl.startsWith('https://')) {
      return fotoUrl;
    }
    return 'http://localhost:8080' + fotoUrl;
  }
}