import React from 'react';
import './Header.css';
import Logo from './Logo';

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
            <Logo size={28} className="title-logo" />
            <span className="title-text">Stock IO</span>
          </h1>
        </div>
        
        <div className="header-center">
          <nav className="main-nav">
            <a href="#portfolio" className="nav-link">Portfolio</a>
            <a href="#watchlist" className="nav-link">Watchlist</a>
            <a href="#insights" className="nav-link">Daily Insights</a>
            <a href="#market" className="nav-link">Market Overview</a>
          </nav>
        </div>

        <div className="header-right">
          {user && isAdmin && (
            <span className="admin-badge">Admin</span>
          )}
          
          {lastUpdated && (
            <div className="last-updated">
              {formatTime(lastUpdated)}
            </div>
          )}
          
          {onRefresh && (
            <button 
              onClick={onRefresh} 
              className="refresh-button"
              title="Refresh data"
            >
              🔄
            </button>
          )}
          
          {user && (
            <button 
              onClick={onLogout} 
              className="logout-button"
              title="Logout"
            >
              🚪
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 