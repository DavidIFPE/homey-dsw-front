// Axios é usada para fazer requisições HTTP (get, post, ect)
import axios from 'axios';

// 1º passo: definir a URL/ENDPOIN base para integração com o backend
export const api = axios.create({
  baseURL: 'http://localhost:8080', // Coloque aqui a porta do seu backend
});

// 2° passo: precisamos definir um interceptor para que o token JWT seja obtido
api.interceptors.request.use(
        // callback para interceptar o token
        (config) => {
            const token = localStorage.getItem('token');
            console.log('[API Interceptor] Token encontrado:', !!token);
            
            if(token){
                config.headers.Authorization = `Bearer ${token}`;
                console.log('[API Interceptor] Header Authorization adicionado');
            } else {
                console.warn('[API Interceptor] AVISO: Token não encontrado no localStorage!');
            }
            
            // Não definir Content-Type se for FormData - deixar navegador definir automaticamente
            if (!(config.data instanceof FormData)) {
                config.headers['Content-Type'] = 'application/json';
            }
            
            console.log('[API Interceptor] URL:', config.url, 'Método:', config.method);
            return config;
        },

        (error) => Promise.reject(error)
);

// Interceptor para responses - captura erros globalmente
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Log apenas em desenvolvimento se necessário
      // console.error('API Error:', error.response.status);
    }
    return Promise.reject(error);
  }
);

// 3° passo
export default api;
