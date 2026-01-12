import { io } from 'socket.io-client';

// Socket configuration - Vite uses VITE_ prefix
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  // Initialize socket connection
  connect() {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    console.log('Connecting to socket server:', SOCKET_URL);
    
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // Fallback to polling if WebSocket fails
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5
    });

    // Connection event handlers
    this.socket.on('connect', () => {
      console.log('Connected to server with ID:', this.socket.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Reconnection failed:', error);
    });

    return this.socket;
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      console.log('Disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Get socket instance
  getSocket() {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket not connected. Attempting to connect...');
      return this.connect();
    }
    return this.socket;
  }

  // Check connection status
  isSocketConnected() {
    return this.socket?.connected || false;
  }

  // Join chat with username and room
  joinChat(username, room = 'general') {
    const socket = this.getSocket();
    socket.emit('user_join', { username, room });
  }

  // Send message to specific room
  sendMessage(text, room = 'general') {
    const socket = this.getSocket();
    socket.emit('send_message', { text, room });
  }

  // Typing indicators
  startTyping() {
    const socket = this.getSocket();
    socket.emit('typing_start');
  }

  stopTyping() {
    const socket = this.getSocket();
    socket.emit('typing_stop');
  }

  // Event listeners
  onMessage(callback) {
    const socket = this.getSocket();
    socket.on('receive_message', callback);
  }

  onUserJoined(callback) {
    const socket = this.getSocket();
    socket.on('user_joined', callback);
  }

  onUserLeft(callback) {
    const socket = this.getSocket();
    socket.on('user_left', callback);
  }

  onUsersUpdate(callback) {
    const socket = this.getSocket();
    socket.on('users_update', callback);
  }

  onOnlineUsers(callback) {
    const socket = this.getSocket();
    socket.on('online_users', callback);
  }

  onTyping(callback) {
    const socket = this.getSocket();
    socket.on('user_typing', callback);
  }

  onError(callback) {
    const socket = this.getSocket();
    socket.on('error', callback);
  }

  // Remove event listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  removeListener(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;