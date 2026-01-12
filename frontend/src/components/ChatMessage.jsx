import React from 'react';

const ChatMessage = ({ message, currentUser, onDelete }) => {
  const isOwnMessage = message.username === currentUser;
  const isSystemMessage = message.messageType === 'system';
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isSystemMessage) {
    return (
      <div className="message-system">
        <span className="system-text">{message.text}</span>
        <span className="message-time">{formatTime(message.timestamp)}</span>
      </div>
    );
  }

  return (
    <div className={`message ${isOwnMessage ? 'message-own' : 'message-other'}`}>
      <div className="message-content">
        {!isOwnMessage && (
          <div className="message-username">{message.username}</div>
        )}
        <div className="message-text">{message.text}</div>
        <div className="message-meta">
          <span className="message-time">{formatTime(message.timestamp)}</span>
          {onDelete && isOwnMessage && (
            <button 
              className="message-delete"
              onClick={() => onDelete(message.id)}
              title="Delete message"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;