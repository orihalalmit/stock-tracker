import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import './PortfolioPage.css';
import PortfolioSummary from './PortfolioSummary';
import PositionsList from './PositionsList';
import AddPositionForm from './AddPositionForm';
import TransactionHistory from './TransactionHistory';
import ImportCSV from './ImportCSV';
import PortfolioInsights from './PortfolioInsights';
import { useAuth } from '../Auth/AuthContext';

const PortfolioPage = ({ activeView = 'management', user: currentUser, onLogout, isAdmin }) => {
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(activeView); // management, insights
  const [showPremarket, setShowPremarket] = useState(false);
  const [isManagementCollapsed, setIsManagementCollapsed] = useState(true);
  const { user, token } = useAuth();
  
  // Use ref to track selected portfolio without causing re-renders
  const selectedPortfolioRef = useRef(null);

  // Sync activeTab with activeView prop when it changes
  useEffect(() => {
    setActiveTab(activeView);
  }, [activeView]);

  const handlePortfolioChange = useCallback(async (portfolioId) => {
    try {
      const url = `/api/portfolio/${portfolioId}${showPremarket ? '?include_premarket=true' : ''}`;
      const response = await axios.get(url);
      const portfolio = response.data;
      setSelectedPortfolio(portfolio);
      selectedPortfolioRef.current = portfolio;
      setPortfolios(prevPortfolios => prevPortfolios.map(p => 
        p._id === portfolio._id ? portfolio : p
      ));
      localStorage.setItem('lastSelectedPortfolioId', portfolioId);
      setError(null);
    } catch (err) {
      setError('Failed to fetch portfolio details');
      console.error(err);
    }
  }, [showPremarket]);

  const fetchPortfolios = useCallback(async () => {
    try {
      console.log('Fetching portfolios...');
      console.log('User:', user?.username, 'Token exists:', !!token);
      console.log('Auth header:', axios.defaults.headers.common['Authorization']);
      
      // First get the list of portfolios
      const response = await axios.get('/api/portfolio');
      const portfoliosList = response.data;
      console.log('Portfolios fetched:', portfoliosList.length);

      if (portfoliosList.length > 0) {
        // Try to restore last selected portfolio from localStorage
        const lastSelectedId = localStorage.getItem('lastSelectedPortfolioId');
        let portfolioToSelect = portfoliosList.find(p => p._id === lastSelectedId);
        
        // If last selected doesn't exist, use current selected or first one
        if (!portfolioToSelect) {
          portfolioToSelect = portfoliosList.find(p => p._id === selectedPortfolioRef.current?._id) || portfoliosList[0];
        }

        console.log('Selected portfolio:', portfolioToSelect.name);
        const url = `/api/portfolio/${portfolioToSelect._id}${showPremarket ? '?include_premarket=true' : ''}`;
        const detailedResponse = await axios.get(url);
        const updatedPortfolio = detailedResponse.data;

        // Update the portfolio in the list with the detailed data
        const updatedPortfolios = portfoliosList.map(p => 
          p._id === updatedPortfolio._id ? updatedPortfolio : p
        );

        setPortfolios(updatedPortfolios);
        setSelectedPortfolio(updatedPortfolio);
        selectedPortfolioRef.current = updatedPortfolio;
        
        // Save to localStorage
        localStorage.setItem('lastSelectedPortfolioId', updatedPortfolio._id);
      } else {
        setPortfolios(portfoliosList);
        setSelectedPortfolio(null);
        selectedPortfolioRef.current = null;
        localStorage.removeItem('lastSelectedPortfolioId');
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching portfolios:', err);
      console.error('Response data:', err.response?.data);
      console.error('Response status:', err.response?.status);
      
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError('Failed to fetch portfolios: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setLoading(false);
    }
  }, [showPremarket, user, token]); // Removed selectedPortfolio dependency

  useEffect(() => {
    if (user && token) {
      fetchPortfolios();
    }
  }, [fetchPortfolios, user, token]);

  // Re-fetch portfolio data when premarket toggle changes
  useEffect(() => {
    if (selectedPortfolioRef.current) {
      handlePortfolioChange(selectedPortfolioRef.current._id);
    }
  }, [showPremarket, handlePortfolioChange]); // Removed selectedPortfolio dependency

  const createPortfolio = async (name) => {
    try {
      const response = await axios.post('/api/portfolio', { name });
      const newPortfolio = response.data;
      setPortfolios(prevPortfolios => [...prevPortfolios, newPortfolio]);
      setSelectedPortfolio(newPortfolio);
      selectedPortfolioRef.current = newPortfolio;
      localStorage.setItem('lastSelectedPortfolioId', newPortfolio._id);
      setError(null);
    } catch (err) {
      setError('Failed to create portfolio');
      console.error(err);
    }
  };

  const deletePortfolio = async (portfolioId) => {
    if (!window.confirm('Are you sure you want to delete this portfolio? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/portfolio/${portfolioId}`);
      
      setPortfolios(prevPortfolios => {
        const updatedPortfolios = prevPortfolios.filter(p => p._id !== portfolioId);
        
        // If we deleted the selected portfolio, select another one
        if (selectedPortfolioRef.current?._id === portfolioId) {
          if (updatedPortfolios.length > 0) {
            const newSelected = updatedPortfolios[0];
            setSelectedPortfolio(newSelected);
            selectedPortfolioRef.current = newSelected;
            localStorage.setItem('lastSelectedPortfolioId', newSelected._id);
          } else {
            setSelectedPortfolio(null);
            selectedPortfolioRef.current = null;
            localStorage.removeItem('lastSelectedPortfolioId');
          }
        }
        
        return updatedPortfolios;
      });
      
      setError(null);
    } catch (err) {
      setError('Failed to delete portfolio');
      console.error(err);
    }
  };

  const handleAddPosition = async (position) => {
    try {
      console.log('🚀 Adding position:', position);
      console.log('🔍 Selected portfolio:', selectedPortfolioRef.current);
      console.log('🔍 Auth token exists:', !!token);
      
      if (!selectedPortfolioRef.current?._id) {
        throw new Error('No portfolio selected');
      }

      const portfolioId = selectedPortfolioRef.current._id;
      console.log('📤 Making API call to:', `/api/portfolio/${portfolioId}/positions`);
      
      const response = await axios.post(
        `/api/portfolio/${portfolioId}/positions`,
        position,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('✅ Position added successfully:', response.data);
      await fetchPortfolios(); // Refresh all portfolios with latest data
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('❌ Error adding position:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      const errorMessage = err.response?.data?.error || err.message || 'Failed to add position';
      setError(`Failed to add position: ${errorMessage}`);
      throw err; // Re-throw so the form can handle it
    }
  };

  const handleImportCSV = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await axios.post(
        `/api/portfolio/${selectedPortfolioRef.current._id}/import`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      await fetchPortfolios(); // Refresh all portfolios with latest data
      setError(null);
    } catch (err) {
      setError('Failed to import positions');
      console.error(err);
    }
  };

  const handleConsolidatePositions = async () => {
    if (!window.confirm('This will consolidate duplicate positions by combining shares and recalculating weighted average cost. Continue?')) {
      return;
    }

    try {
      const response = await axios.post(`/api/portfolio/${selectedPortfolioRef.current._id}/consolidate`);
      
      if (response.data.duplicatesConsolidated > 0) {
        alert(`Successfully consolidated ${response.data.duplicatesConsolidated} duplicate positions!`);
      } else {
        alert('No duplicate positions found to consolidate.');
      }
      
      await fetchPortfolios(); // Refresh all portfolios with latest data
      setError(null);
    } catch (err) {
      setError('Failed to consolidate positions');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading">Loading portfolios...</div>;
  }

  const renderTabContent = () => {
    if (!selectedPortfolio) {
      return (
        <div className="no-portfolio">
          <p>No portfolios found. Create a new portfolio to get started.</p>
          <button
            onClick={() => {
              const name = prompt('Enter portfolio name:');
              if (name) createPortfolio(name);
            }}
          >
            Create Portfolio
          </button>
        </div>
      );
    }

    if (activeTab === 'insights') {
      return <PortfolioInsights portfolio={selectedPortfolio} />;
    }

    return (
      <>
        <PortfolioSummary portfolio={selectedPortfolio} showPremarket={showPremarket} />

        <PositionsList
          positions={selectedPortfolio.positions}
          portfolioId={selectedPortfolio._id}
          onPositionUpdate={fetchPortfolios}
          portfolioSummary={selectedPortfolio.summary}
        />

        <TransactionHistory portfolioId={selectedPortfolio._id} />
        
        <div className="portfolio-actions">
          <AddPositionForm onSubmit={handleAddPosition} />
          <ImportCSV onImport={handleImportCSV} />
          <button 
            className="consolidate-btn"
            onClick={handleConsolidatePositions}
            title="Consolidate duplicate positions"
          >
            🔄 Consolidate Duplicates
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="portfolio-page">
      <div className="portfolio-header">
        <div className="management-toggle">
          <div className="toggle-left">
            <button 
              className="toggle-management-btn"
              onClick={() => setIsManagementCollapsed(!isManagementCollapsed)}
            >
              <span className="toggle-icon">{isManagementCollapsed ? '▶' : '▼'}</span>
              <span>Portfolio Settings</span>
            </button>
            <span className="current-portfolio-name">
              {selectedPortfolio?.name || 'No Portfolio Selected'}
            </span>
          </div>
          <div className="user-controls">
            {isAdmin && (
              <span className="admin-badge-portfolio">Admin</span>
            )}
            <span className="username">👤 {currentUser?.username || currentUser?.email || user?.username || user?.email || 'User'}</span>
            <button 
              className="signout-btn"
              onClick={onLogout}
              title="Sign Out"
            >
              🚪
            </button>
          </div>
        </div>
        
        {!isManagementCollapsed && (
          <div className="portfolio-controls">
            <div className="portfolio-selector">
              <select
                value={selectedPortfolio?._id || ''}
                onChange={(e) => handlePortfolioChange(e.target.value)}
              >
                {portfolios.map(portfolio => (
                  <option key={portfolio._id} value={portfolio._id}>
                    {portfolio.name}
                  </option>
                ))}
              </select>
              <button
                className="new-portfolio-btn"
                onClick={() => {
                  const name = prompt('Enter portfolio name:');
                  if (name) createPortfolio(name);
                }}
              >
                New Portfolio
              </button>
              {selectedPortfolio && portfolios.length > 1 && (
                <button
                  className="delete-portfolio-btn"
                  onClick={() => deletePortfolio(selectedPortfolio._id)}
                  title="Delete Portfolio"
                >
                  🗑️ Delete
                </button>
              )}
            </div>
            {selectedPortfolio && (
              <div className="premarket-toggle">
                <input
                  type="checkbox"
                  id="extended-hours-toggle"
                  checked={showPremarket}
                  onChange={(e) => setShowPremarket(e.target.checked)}
                />
                <label htmlFor="extended-hours-toggle">Extended Hours Analysis</label>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Portfolio Sub-tabs */}
      {selectedPortfolio && (
        <div className="portfolio-tabs">
          <button
            className={`portfolio-tab-button ${activeTab === 'management' ? 'active' : ''}`}
            onClick={() => setActiveTab('management')}
          >
            📊 Overview & Management
          </button>
          <button
            className={`portfolio-tab-button ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            💡 Daily Insights
          </button>
        </div>
      )}

      {renderTabContent()}
    </div>
  );
};

export default PortfolioPage; 