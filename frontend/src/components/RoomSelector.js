import React, { useState, useEffect } from 'react';
import { messageAPI } from '../services/api';

const RoomSelector = ({ currentRoom, onRoomChange, onCreateRoom }) => {
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
      
      // For now, we'll use a simple room list since we don't have the rooms API yet
      const defaultRooms = [
        { name: 'general', displayName: 'General', messageCount: 0, isActive: true },
        { name: 'random', displayName: 'Random', messageCount: 0, isActive: true },
        { name: 'tech', displayName: 'Tech Talk', messageCount: 0, isActive: true }
      ];
      
      setRooms(defaultRooms);
      
    } catch (error) {
      console.error('Failed to load rooms:', error);
      setError('Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleRoomSelect = (roomName) => {
    if (roomName !== currentRoom) {
      onRoomChange(roomName);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    
    const trimmedName = newRoomName.trim();
    if (!trimmedName) return;

    try {
      setError('');
      
      // Simple room creation - just add to local list
      const roomName = trimmedName.toLowerCase().replace(/\s+/g, '-');
      const newRoom = {
        name: roomName,
        displayName: trimmedName,
        messageCount: 0,
        isActive: true
      };
      
      setRooms(prev => [...prev, newRoom]);
      onCreateRoom?.(newRoom);
      
      // Clear form
      setNewRoomName('');
      setNewRoomDescription('');
      setShowCreateForm(false);
      
      // Switch to new room
      onRoomChange(roomName);
      
    } catch (error) {
      console.error('Failed to create room:', error);
      setError('Failed to create room');
    }
  };

  return (
    <div className="room-selector">
      <div className="room-selector-header">
        <h3>Chat Rooms</h3>
        <button
          className="create-room-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
          title="Create new room"
        >
          +
        </button>
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