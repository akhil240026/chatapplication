import React, { useState, useEffect, useRef, useCallback } from 'react';
import socketService from './services/socket';
import { messageAPI } from './services/api';
import errorHandler, { ERROR_TYPES } from './utils/errorHandler';
import ChatMessage from './components/ChatMessage.jsx';
import MessageInput from './components/MessageInput.jsx';
import UserList from './components/UserList.jsx';
import ConnectionStatus from './components/ConnectionStatus.jsx';
import RoomSelector from './components/RoomSelector.jsx';
import './App.css';

function App() {
  // State management
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showMobileUserList, setShowMobileUserList] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load chat history for specific room with error handling
  const loadChatHistory = useCallback(async (room = currentRoom) => {
    try {
      setIsLoadingHistory(true);
      setConnectionError('');
      
      const response = await errorHandler.retry(
        () => messageAPI.getRecentMessages(room),
        3,
        1000
      );
      
      if (response.success) {
        setMessages(response.data.messages);
        console.log(`Loaded ${response.data.messages.length} recent messages for room: ${room}`);
      }
    } catch (error) {
      const chatError = errorHandler.handleApiError(error);
      setConnectionError(errorHandler.getUserMessage(chatError));
    } finally {
      setIsLoadingHistory(false);
    }
  }, [currentRoom]);

  // Socket event handlers
  const setupSocketListeners = useCallback(() => {
    const socket = socketService.getSocket();

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError('');
      
      // Rejoin if already logged in
      if (isLoggedIn && username) {
        socketService.joinChat(username, currentRoom);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionError(`Disconnected: ${reason}`);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      setIsConnecting(false);
      const chatError = errorHandler.handleSocketError(error);
      setConnectionError(errorHandler.getUserMessage(chatError));
    });

    // Chat events
    socket.on('receive_message', (message) => {
      console.log('Received message:', message);
      // Only add message if it's for the current room
      if (message.room === currentRoom) {
        setMessages(prev => [...prev, message]);
      }
    });

    socket.on('user_joined', (data) => {
      console.log('User joined:', data);
      const systemMessage = {
        id: `system-${Date.now()}`,
        username: 'System',
        text: data.message,
        timestamp: data.timestamp,
        messageType: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
    });

    socket.on('user_left', (data) => {
      console.log('User left:', data);
      const systemMessage = {
        id: `system-${Date.now()}`,
        username: 'System',
        text: data.message,
        timestamp: data.timestamp,
        messageType: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
    });

    socket.on('online_users', (users) => {
      console.log('Online users:', users);
      setOnlineUsers(users);
    });

    socket.on('users_update', (users) => {
      console.log('Users update:', users);
      setOnlineUsers(users);
    });

    socket.on('user_typing', (data) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(user => user.username !== data.username);
        if (data.isTyping) {
          return [...filtered, data];
        }
        return filtered;
      });
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      const chatError = errorHandler.handleSocketError(error);
      setConnectionError(errorHandler.getUserMessage(chatError));
    });

    // Listen for room creation events
    socket.on('room_created', (data) => {
      console.log('New room created:', data);
      // You could show a notification here or refresh room list
      // For now, the RoomSelector component will handle periodic refresh
    });

  }, [isLoggedIn, username, currentRoom]);

  // Initialize socket connection
  useEffect(() => {
    setIsConnecting(true);
    socketService.connect();
    setupSocketListeners();

    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [setupSocketListeners]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) return;

    try {
      setIsConnecting(true);
      
      // Ensure socket is connected
      if (!socketService.isSocketConnected()) {
        socketService.connect();
        // Wait a bit for connection
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Load chat history first
      await loadChatHistory(currentRoom);
      
      // Join chat
      socketService.joinChat(trimmedUsername, currentRoom);
      setIsLoggedIn(true);
      
      console.log(`${trimmedUsername} joined the chat`);
      
    } catch (error) {
      console.error('Login failed:', error);
      setConnectionError('Failed to join chat');
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle sending messages with validation and error handling
  const handleSendMessage = useCallback((text) => {
    try {
      // Client-side validation
      if (!text || !text.trim()) {
        throw new Error('Message cannot be empty');
      }
      
      if (text.length > 1000) {
        throw new Error('Message too long (max 1000 characters)');
      }
      
      if (!isConnected) {
        throw new Error('Not connected to server');
      }
      
      socketService.sendMessage(text, currentRoom);
      console.log('Message sent to room:', currentRoom, text);
      
      // Clear any previous errors
      setConnectionError('');
      
    } catch (error) {
      const chatError = errorHandler.handleValidationError(
        'Message',
        text,
        error.message
      );
      setConnectionError(errorHandler.getUserMessage(chatError));
    }
  }, [isConnected, currentRoom]);

  // Handle typing indicators
  const handleTyping = useCallback((isTyping) => {
    if (!isConnected) return;
    
    try {
      if (isTyping) {
        socketService.startTyping();
      } else {
        socketService.stopTyping();
      }
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }, [isConnected]);

  // Handle room changes
  const handleRoomChange = useCallback(async (newRoom) => {
    if (newRoom === currentRoom) return;
    
    try {
      console.log('Changing room from', currentRoom, 'to', newRoom);
      
      // Clear current messages
      setMessages([]);
      setOnlineUsers([]);
      setTypingUsers([]);
      
      // Update current room
      setCurrentRoom(newRoom);
      
      // Load new room's history
      await loadChatHistory(newRoom);
      
      // Rejoin with new room if logged in
      if (isLoggedIn && username && isConnected) {
        socketService.joinChat(username, newRoom);
      }
      
    } catch (error) {
      console.error('Failed to change room:', error);
      setConnectionError('Failed to change room');
    }
  }, [currentRoom, isLoggedIn, username, isConnected, loadChatHistory]);

  // Handle room creation
  const handleCreateRoom = useCallback((roomData) => {
    console.log('Room created:', roomData);
    // Room creation is handled by RoomSelector component
  }, []);

  // Handle mobile user list toggle
  const toggleMobileUserList = useCallback(() => {
    setShowMobileUserList(prev => !prev);
  }, []);

  const closeMobileUserList = useCallback(() => {
    setShowMobileUserList(false);
  }, []);
  const handleDeleteMessage = useCallback(async (messageId) => {
    try {
      await messageAPI.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      console.log('Message deleted:', messageId);
    } catch (error) {
      const chatError = errorHandler.handleApiError(error);
      setConnectionError(errorHandler.getUserMessage(chatError));
    }
  }, []);

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <form onSubmit={handleLogin} className="login-form">
          <h2 className="login-title">Join Chat</h2>
          
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="form-input"
              maxLength={50}
              required
              autoFocus
            />
          </div>
          
          <button
            type="submit"
            disabled={!username.trim() || isConnecting}
            className="login-button"
          >
            {isConnecting ? 'Connecting...' : 'Join Chat'}
          </button>
          
          {connectionError && (
            <div className="error-message">
              {connectionError}
            </div>
          )}
        </form>
      </div>
    );
  }

  // Main chat interface
  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">Real-Time Chat</h1>
            {isLoggedIn && (
              <div className="current-room">
                #{currentRoom}
              </div>
            )}
          </div>
          <ConnectionStatus
            isConnected={isConnected}
            isConnecting={isConnecting}
            error={connectionError}
          />
        </div>
      </header>

      <main className="main-content">
        <div className="chat-container">
          <div 
            className="messages-container"
            ref={messagesContainerRef}
          >
            {isLoadingHistory && (
              <div className="loading-message">Loading chat history...</div>
            )}
            
            <div className="messages-list">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  currentUser={username}
                  onDelete={handleDeleteMessage}
                />
              ))}
            </div>
            
            <div ref={messagesEndRef} />
          </div>

          <div className="message-input-container">
            <MessageInput
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              disabled={!isConnected}
            />
          </div>
        </div>

        {/* Desktop User List */}
        <div className="user-list-container">
          <RoomSelector
            currentRoom={currentRoom}
            onRoomChange={handleRoomChange}
            onCreateRoom={handleCreateRoom}
          />
          <UserList
            users={onlineUsers}
            currentUser={username}
            typingUsers={typingUsers}
          />
        </div>

        {/* Mobile User List Toggle Button */}
        <button 
          className="mobile-user-toggle"
          onClick={toggleMobileUserList}
          title="Show users and rooms"
        >
          👥
        </button>

        {/* Mobile User List Overlay */}
        <div 
          className={`user-list-overlay ${showMobileUserList ? 'active' : ''}`}
          onClick={closeMobileUserList}
        >
          <div className="user-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Users & Rooms</h3>
              <button 
                className="modal-close"
                onClick={closeMobileUserList}
                title="Close"
              >
                ×
              </button>
            </div>
            <RoomSelector
              currentRoom={currentRoom}
              onRoomChange={handleRoomChange}
              onCreateRoom={handleCreateRoom}
              onMobileClose={closeMobileUserList}
            />
            <UserList
              users={onlineUsers}
              currentUser={username}
              typingUsers={typingUsers}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;