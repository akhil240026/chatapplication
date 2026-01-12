import axios from 'axios';

// API configuration - Vite uses VITE_ prefix
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    
    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 404:
          console.error('Resource not found');
          break;
        case 500:
          console.error('Server error');
          break;
        default:
          console.error(`HTTP Error ${status}:`, data?.error || 'Unknown error');
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Network error - no response received');
    } else {
      // Something else happened
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API methods
export const messageAPI = {
  // Get chat history with pagination
  getMessages: async (room = 'general', page = 1, limit = 50) => {
    try {
      const response = await api.get('/messages', {
        params: { room, page, limit }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }
  },

  // Get recent messages (last 24 hours)
  getRecentMessages: async (room = 'general') => {
    try {
      const response = await api.get('/messages/recent', {
        params: { room }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch recent messages: ${error.message}`);
    }
  },

  // Delete message (admin)
  deleteMessage: async (messageId) => {
    try {
      const response = await api.delete(`/messages/${messageId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  },

  // Get chat statistics
  getStats: async (room = 'general') => {
    try {
      const response = await api.get('/messages/stats', {
        params: { room }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch stats: ${error.message}`);
    }
  }
};

// Health check
export const healthAPI = {
  checkHealth: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }
};

// Rooms API
export const roomsAPI = {
  // Get all available rooms
  getRooms: async () => {
    try {
      const response = await api.get('/rooms');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch rooms: ${error.message}`);
    }
  },

  // Create a new room
  createRoom: async (name, description = '') => {
    try {
      const response = await api.post('/rooms', {
        name: name.trim(),
        description: description.trim()
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 409) {
        throw new Error('Room already exists');
      }
      throw new Error(`Failed to create room: ${error.response?.data?.error || error.message}`);
    }
  },

  // Get messages for a specific room
  getRoomMessages: async (roomName, page = 1, limit = 50) => {
    try {
      const response = await api.get(`/rooms/${roomName}/messages`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch room messages: ${error.message}`);
    }
  }
};

// Export axios instance for custom requests
export default api;