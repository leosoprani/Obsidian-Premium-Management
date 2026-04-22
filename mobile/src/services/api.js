import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// URL de base para o Backend
// Para desenvolvimento local em emulador Android, use 10.0.2.2
// Para iOS ou Web local, use localhost
export const BASE_URL = __DEV__
  ? (Platform.OS === 'web' ? 'http://localhost:3000' : 'http://192.168.0.229:3000')
  : 'https://storey-luxor-web.onrender.com';

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
      // Limpa os dados de autenticação para forçar um novo login
      await AsyncStorage.multiRemove([
        '@auth_token', 
        '@user_role', 
        '@user_username', 
        '@user_apartments'
      ]);
    }
    return Promise.reject(error);
  }
);

export default api;
