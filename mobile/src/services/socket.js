import { io } from 'socket.io-client';
import { BASE_URL } from './api';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Set();
  }

  connect() {
    if (this.socket?.connected) return;

    console.log('[Socket] Conectando ao servidor:', BASE_URL);
    this.socket = io(BASE_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Conectado ao WebSocket com sucesso.');
    });

    this.socket.on('data_updated', (data) => {
      console.log('[Socket] Atualização de dados recebida:', data);
      this.listeners.forEach(callback => callback(data));
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Desconectado do WebSocket.');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Erro de conexão:', error.message);
    });
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

const socketService = new SocketService();
export default socketService;
