import React, { useState, useRef, useEffect } from 'react';

const MessageInput = ({ onSendMessage, onTyping, disabled }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Handle typing indicator
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTyping?.(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTyping?.(false);
      }
    }, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    // Send message
    onSendMessage(trimmedMessage);
    
    // Clear input and typing state
    setMessage('');
    setIsTyping(false);
    onTyping?.(false);
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Focus input after sending
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="message-input-form">
      <div className="input-container">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={disabled ? "Connecting..." : "Type a message..."}
          disabled={disabled}
          className="message-input"
          maxLength={1000}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className="send-button"
          title="Send message (Enter)"
        >
          Send
        </button>
      </div>
      <div className="input-info">
        <span className="char-count">
          {message.length}/1000
        </span>
      </div>
    </form>
  );
};

export default MessageInput;