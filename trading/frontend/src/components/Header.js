import React, { useState } from 'react';
import './Header.css';
import Logo from './Logo';

const Header = ({ lastUpdated, onRefresh, user, onLogout, isAdmin, activeTab, onTabChange }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
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
          <div className="menu-dropdown">
            <button 
              className="menu-toggle"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              onMouseEnter={() => setIsMenuOpen(true)}
            >
              Menu ⋮
            </button>
            {isMenuOpen && (
              <nav 
                className="dropdown-nav"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                <button 
                  className={`nav-link ${activeTab === 'portfolio' ? 'active' : ''}`}
                  onClick={() => { onTabChange('portfolio'); setIsMenuOpen(false); }}
                >
                  📊 Portfolio
                </button>
                <button 
                  className={`nav-link ${activeTab === 'watchlists' ? 'active' : ''}`}
                  onClick={() => { onTabChange('watchlists'); setIsMenuOpen(false); }}
                >
                  👁 Watchlist
                </button>
                <button 
                  className={`nav-link ${activeTab === 'insights' ? 'active' : ''}`}
                  onClick={() => { onTabChange('insights'); setIsMenuOpen(false); }}
                >
                  💡 Daily Insights
                </button>
                <button 
                  className={`nav-link ${activeTab === 'market' ? 'active' : ''}`}
                  onClick={() => { onTabChange('market'); setIsMenuOpen(false); }}
                >
                  📈 Market Overview
                </button>
              </nav>
            )}
          </div>
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