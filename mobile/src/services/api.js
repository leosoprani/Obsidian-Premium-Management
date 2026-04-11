import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// PRODUÇÃO: Backend hospedado no Render.com
// Para desenvolvimento local, troque pela URL abaixo:
// export const BASE_URL = 'http://192.168.1.9:3000'; // IP do seu PC local (SEM /api)
export const BASE_URL = 'https://storey-luxor-web.onrender.com'; // Produção no Render

const API_URL = `${BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30s
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para injetar o Token JWT em todas as requisições
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Erro ao recuperar o token do AsyncStorage', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para captar erros 401/403 (Token Inválido ou Expirado)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn('Sessão expirada ou acesso negado. Limpando dados...');
      // Você pode optar por limpar o token aqui para forçar um relogin
      // await AsyncStorage.removeItem('@auth_token');
    }
    return Promise.reject(error);
  }
);

export default api;
