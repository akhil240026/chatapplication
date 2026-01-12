import React, { useState, useEffect } from 'react';
import { roomsAPI } from '../services/api';

const RoomSelector = ({ currentRoom, onRoomChange, onCreateRoom, onMobileClose, currentUser }) => {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [error, setError] = useState('');

  // Load available rooms
  const loadRooms = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await roomsAPI.getRooms(currentUser);
      
      if (response.success) {
        setRooms(response.data.rooms);
      }
      
    } catch (error) {
      console.error('Failed to load rooms:', error);
      setError('Failed to load rooms');
      
      // Fallback to default rooms
      const defaultRooms = [
        { name: 'general', displayName: 'General', messageCount: 0, isActive: true, isPrivate: false, canJoin: true },
        { name: 'random', displayName: 'Random', messageCount: 0, isActive: true, isPrivate: false, canJoin: true },
        { name: 'tech', displayName: 'Tech Talk', messageCount: 0, isActive: true, isPrivate: false, canJoin: true }
      ];
      setRooms(defaultRooms);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  // Listen for room creation events
  useEffect(() => {
    // This would be better handled through a socket context, but for now we'll reload rooms periodically
    const interval = setInterval(() => {
      loadRooms();
    }, 30000); // Reload every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRoomSelect = async (room) => {
    if (room.name === currentRoom) return;
    
    // If room requires joining (private room user isn't member of)
    if (room.isPrivate && !room.canJoin) {
      setShowJoinForm(true);
      return;
    }
    
    onRoomChange(room.name);
    // Close mobile modal if callback provided
    onMobileClose?.();
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    
    const trimmedName = newRoomName.trim();
    if (!trimmedName || !currentUser) return;

    try {
      setError('');
      
      // Create room via API
      const response = await roomsAPI.createRoom(
        trimmedName, 
        newRoomDescription, 
        isPrivateRoom, 
        roomPassword, 
        currentUser
      );
      
      if (response.success) {
        const newRoom = response.data.room;
        
        // Add to local rooms list
        const roomForList = {
          name: newRoom.name,
          displayName: newRoom.displayName,
          description: newRoom.description,
          messageCount: newRoom.messageCount || 0,
          isActive: true,
          isPrivate: newRoom.isPrivate,
          canJoin: true,
          inviteCode: newRoom.inviteCode
        };
        
        setRooms(prev => [...prev, roomForList]);
        onCreateRoom?.(roomForList);
        
        // Show invite code for private rooms
        if (newRoom.isPrivate && newRoom.inviteCode) {
          alert(`Private room created! Share this invite code: ${newRoom.inviteCode}`);
        }
        
        // Clear form
        setNewRoomName('');
        setNewRoomDescription('');
        setIsPrivateRoom(false);
        setRoomPassword('');
        setShowCreateForm(false);
        
        // Switch to new room
        onRoomChange(newRoom.name);
        
        // Close mobile modal if callback provided
        onMobileClose?.();
        
        // Reload rooms to get updated data
        setTimeout(() => {
          loadRooms();
        }, 1000);
      }
      
    } catch (error) {
      console.error('Failed to create room:', error);
      setError(error.message || 'Failed to create room');
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    
    if (!joinCode.trim() && !joinPassword.trim()) {
      setError('Please enter invite code or password');
      return;
    }

    try {
      setError('');
      
      // First, try to get room info by invite code
      let roomName = '';
      if (joinCode.trim()) {
        const roomInfo = await roomsAPI.getRoomByInviteCode(joinCode);
        roomName = roomInfo.data.room.name;
      }
      
      // Join the room
      const response = await roomsAPI.joinRoom(
        roomName, 
        currentUser, 
        joinCode, 
        joinPassword
      );
      
      if (response.success) {
        // Clear form
        setJoinCode('');
        setJoinPassword('');
        setShowJoinForm(false);
        
        // Reload rooms and switch to the joined room
        await loadRooms();
        onRoomChange(response.data.room.name);
        
        // Close mobile modal if callback provided
        onMobileClose?.();
      }
      
    } catch (error) {
      console.error('Failed to join room:', error);
      setError(error.message || 'Failed to join room');
    }
  };

  return (
    <div className="room-selector">
      <div className="room-selector-header">
        <h3>Chat Rooms</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className="refresh-rooms-btn"
            onClick={loadRooms}
            title="Refresh rooms"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#f3f4f6',
              color: '#6b7280',
              border: 'none',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px'
            }}
          >
            🔄
          </button>
          <button
            className="join-room-btn"
            onClick={() => setShowJoinForm(!showJoinForm)}
            title="Join private room"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px'
            }}
          >
            🔑
          </button>
          <button
            className="create-room-btn"
            onClick={() => setShowCreateForm(!showCreateForm)}
            title="Create new room"
          >
            +
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreateRoom} className="create-room-form">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Room name"
            className="room-input"
            maxLength={50}
            required
          />
          <input
            type="text"
            value={newRoomDescription}
            onChange={(e) => setNewRoomDescription(e.target.value)}
            placeholder="Description (optional)"
            className="room-input"
            maxLength={100}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivateRoom}
              onChange={(e) => setIsPrivateRoom(e.target.checked)}
            />
            <label htmlFor="isPrivate" style={{ fontSize: '0.8rem', color: '#374151' }}>
              Private room (invite only)
            </label>
          </div>
          {isPrivateRoom && (
            <input
              type="password"
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              placeholder="Password (optional)"
              className="room-input"
              maxLength={50}
            />
          )}
          <div className="form-buttons">
            <button type="submit" className="create-btn">Create</button>
            <button 
              type="button" 
              onClick={() => {
                setShowCreateForm(false);
                setNewRoomName('');
                setNewRoomDescription('');
                setIsPrivateRoom(false);
                setRoomPassword('');
              }}
              className="cancel-btn"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {showJoinForm && (
        <form onSubmit={handleJoinRoom} className="create-room-form">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Invite code (e.g., A1B2)"
            className="room-input"
            maxLength={10}
          />
          <input
            type="password"
            value={joinPassword}
            onChange={(e) => setJoinPassword(e.target.value)}
            placeholder="Password (if required)"
            className="room-input"
            maxLength={50}
          />
          <div className="form-buttons">
            <button type="submit" className="create-btn">Join</button>
            <button 
              type="button" 
              onClick={() => {
                setShowJoinForm(false);
                setJoinCode('');
                setJoinPassword('');
              }}
              className="cancel-btn"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="room-list">
        {isLoading ? (
          <div className="loading">Loading rooms...</div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.name}
              className={`room-item ${currentRoom === room.name ? 'active' : ''}`}
              onClick={() => handleRoomSelect(room)}
            >
              <div className="room-info">
                <div className="room-name">
                  #{room.displayName || room.name}
                  {room.isPrivate && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>🔒</span>}
                  {!room.canJoin && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#f59e0b' }}>🔑</span>}
                </div>
                <div className="room-meta">
                  {room.messageCount > 0 && (
                    <span className="message-count">{room.messageCount} messages</span>
                  )}
                  {room.memberCount > 0 && (
                    <span className="message-count"> • {room.memberCount} members</span>
                  )}
                </div>
              </div>
              {room.isActive && <div className="room-indicator"></div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RoomSelector;