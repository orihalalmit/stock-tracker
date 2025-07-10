import React from 'react';
import './Header.css';

const Header = ({ lastUpdated, onRefresh, user, onLogout, isAdmin }) => {
  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="app-title">
            <span className="title-icon">📈</span>
            Trading App
          </h1>
          <p className="app-subtitle">Portfolio Management & Market Analysis</p>
        </div>
        
        <div className="header-right">
          {user && (
            <div className="user-info">
              <span className="welcome-text">
                Welcome, {user.firstName || user.username}
                {isAdmin && <span className="admin-badge">Admin</span>}
              </span>
            </div>
          )}
          
          {lastUpdated && (
            <div className="last-updated">
              Last updated: {formatTime(lastUpdated)}
            </div>
          )}
          
          {onRefresh && (
            <button 
              onClick={onRefresh} 
              className="refresh-button"
              title="Refresh data"
            >
              <span className="refresh-icon">🔄</span>
              Refresh
            </button>
          )}
          
          {user && (
            <button 
              onClick={onLogout} 
              className="logout-button"
              title="Logout"
            >
              <span className="logout-icon">🚪</span>
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 