import api from './api';

export interface UserProfileUpdateDTO {
  nome: string;
  email: string;
  username: string;
  telefone: string;
  dataNascimento: string;
  resumo?: string;
}

export interface UserProfileDTO {
  id: number;
  nome: string;
  email: string;
  username: string;
  telefone: string;
  dataNascimento: string;
  tipo: string;
  cpfCnpj: string;
  fotoPerfil?: string;
  fotoPerfilUrl?: string;
  resumo?: string;
  dataCriacao: string;
}

export const userProfileService = {

  async getProfile(): Promise<UserProfileDTO> {
    try {
      const response = await api.get<UserProfileDTO>('/usuario/perfil');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter perfil:', error);
      throw error;
    }
  },


  async updateProfile(data: UserProfileUpdateDTO): Promise<UserProfileDTO> {
    try {
      const response = await api.put<UserProfileDTO>('/usuario/atualizar-perfil', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  },


  async uploadProfilePhoto(file: File): Promise<{ fotoPerfilUrl: string }> {
    try {
      const formData = new FormData();
      formData.append('arquivo', file);

      const response = await api.post<{ fotoPerfilUrl: string }>(
        '/usuario/upload-foto-perfil',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      throw error;
    }
  },


  async deleteProfilePhoto(): Promise<void> {
    try {
      await api.delete('/usuario/foto-perfil');
    } catch (error) {
      console.error('Erro ao deletar foto de perfil:', error);
      throw error;
    }
  },


  async getProfilePhotoUrl(userId: number): Promise<string> {
    try {
      const response = await api.get<{ url: string }>(`/usuario/${userId}/foto-perfil`);
      return response.data.url;
    } catch (error) {
      console.error('Erro ao obter URL da foto:', error);
      throw error;
    }
  },
};

export default userProfileService;
