import React from 'react';

const UserList = ({ users, currentUser, typingUsers }) => {
  const formatJoinTime = (joinedAt) => {
    const date = new Date(joinedAt);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isUserTyping = (username) => {
    return typingUsers.some(user => user.username === username && user.isTyping);
  };

  return (
    <div className="user-list">
      <div className="user-list-header">
        <h3>Online Users ({users.length})</h3>
      </div>
      
      <div className="user-list-content">
        {users.length === 0 ? (
          <div className="no-users">No users online</div>
        ) : (
          users.map((user) => (
            <div 
              key={user.id} 
              className={`user-item ${user.username === currentUser ? 'current-user' : ''}`}
            >
              <div className="user-info">
                <div className="user-avatar">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="user-details">
                  <div className="user-name">
                    {user.username}
                    {user.username === currentUser && (
                      <span className="you-indicator">(You)</span>
                    )}
                  </div>
                  <div className="user-status">
                    {isUserTyping(user.username) ? (
                      <span className="typing-indicator">typing...</span>
                    ) : (
                      <span className="join-time">
                        Joined {formatJoinTime(user.joinedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="user-online-indicator"></div>
            </div>
          ))
        )}
      </div>
      
      {typingUsers.length > 0 && (
        <div className="typing-section">
          <div className="typing-header">Currently typing:</div>
          {typingUsers
            .filter(user => user.isTyping && user.username !== currentUser)
            .map((user, index) => (
              <div key={index} className="typing-user">
                {user.username}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};

export default UserList;