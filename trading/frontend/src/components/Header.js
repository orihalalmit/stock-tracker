import React from 'react';
import './Header.css';

const Header = ({ lastUpdated, onRefresh }) => {
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
            Stock Tracker
          </h1>
          <p className="app-subtitle">Real-time stock market monitoring</p>
        </div>
        
        <div className="header-right">
          {lastUpdated && (
            <div className="last-updated">
              Last updated: {formatTime(lastUpdated)}
            </div>
          )}
          <button 
            onClick={onRefresh} 
            className="refresh-button"
            title="Refresh data"
          >
            <span className="refresh-icon">🔄</span>
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 