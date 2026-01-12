import React, { useState, useEffect } from 'react';
import { roomsAPI } from '../services/api';

const RoomSelector = ({ currentRoom, onRoomChange, onCreateRoom, onMobileClose }) => {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [error, setError] = useState('');

  // Load available rooms
  const loadRooms = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await roomsAPI.getRooms();
      
      if (response.success) {
        // Transform API response to match component format
        const transformedRooms = response.data.rooms.map(room => ({
          name: room.name,
          displayName: room.name.charAt(0).toUpperCase() + room.name.slice(1).replace(/-/g, ' '),
          messageCount: room.messageCount,
          isActive: room.isActive,
          lastMessage: room.lastMessage
        }));
        
        // Add default rooms if they don't exist
        const defaultRooms = ['general', 'random', 'tech'];
        const existingRoomNames = transformedRooms.map(r => r.name);
        
        defaultRooms.forEach(roomName => {
          if (!existingRoomNames.includes(roomName)) {
            transformedRooms.unshift({
              name: roomName,
              displayName: roomName.charAt(0).toUpperCase() + roomName.slice(1),
              messageCount: 0,
              isActive: true
            });
          }
        });
        
        setRooms(transformedRooms);
      }
      
    } catch (error) {
      console.error('Failed to load rooms:', error);
      setError('Failed to load rooms');
      
      // Fallback to default rooms
      const defaultRooms = [
        { name: 'general', displayName: 'General', messageCount: 0, isActive: true },
        { name: 'random', displayName: 'Random', messageCount: 0, isActive: true },
        { name: 'tech', displayName: 'Tech Talk', messageCount: 0, isActive: true }
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

  const handleRoomSelect = (roomName) => {
    if (roomName !== currentRoom) {
      onRoomChange(roomName);
      // Close mobile modal if callback provided
      onMobileClose?.();
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    
    const trimmedName = newRoomName.trim();
    if (!trimmedName) return;

    try {
      setError('');
      
      // Create room via API
      const response = await roomsAPI.createRoom(trimmedName, newRoomDescription);
      
      if (response.success) {
        const newRoom = response.data.room;
        
        // Add to local rooms list
        const roomForList = {
          name: newRoom.name,
          displayName: newRoom.displayName,
          messageCount: newRoom.messageCount || 0,
          isActive: true
        };
        
        setRooms(prev => [...prev, roomForList]);
        onCreateRoom?.(roomForList);
        
        // Clear form
        setNewRoomName('');
        setNewRoomDescription('');
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
          <div className="form-buttons">
            <button type="submit" className="create-btn">Create</button>
            <button 
              type="button" 
              onClick={() => setShowCreateForm(false)}
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
              onClick={() => handleRoomSelect(room.name)}
            >
              <div className="room-info">
                <div className="room-name">#{room.displayName || room.name}</div>
                <div className="room-meta">
                  {room.messageCount > 0 && (
                    <span className="message-count">{room.messageCount} messages</span>
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