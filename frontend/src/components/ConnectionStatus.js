import React from 'react';

const ConnectionStatus = ({ isConnected, isConnecting, error }) => {
  if (isConnected) {
    return (
      <div className="connection-status connected">
        <div className="status-indicator"></div>
        <span>Connected</span>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="connection-status connecting">
        <div className="status-indicator"></div>
        <span>Connecting...</span>
      </div>
    );
  }

  return (
    <div className="connection-status disconnected">
      <div className="status-indicator"></div>
      <span>Disconnected</span>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;