import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './PortfolioPage.css';
import PortfolioSummary from './PortfolioSummary';
import PositionsList from './PositionsList';
import AddPositionForm from './AddPositionForm';
import TransactionHistory from './TransactionHistory';
import ImportCSV from './ImportCSV';
import PortfolioInsights from './PortfolioInsights';

const PortfolioPage = ({ activeView = 'management' }) => {
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(activeView); // management, insights
  const [showPremarket, setShowPremarket] = useState(false);

  // Sync activeTab with activeView prop when it changes
  useEffect(() => {
    setActiveTab(activeView);
  }, [activeView]);

  useEffect(() => {
    fetchPortfolios();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch portfolio data when premarket toggle changes
  useEffect(() => {
    if (selectedPortfolio) {
      handlePortfolioChange(selectedPortfolio._id);
    }
  }, [showPremarket, selectedPortfolio, handlePortfolioChange]);

  const fetchPortfolios = async () => {
    try {
      // First get the list of portfolios
      const response = await axios.get('/api/portfolio');
      const portfoliosList = response.data;

      if (portfoliosList.length > 0) {
        // Try to restore last selected portfolio from localStorage
        const lastSelectedId = localStorage.getItem('lastSelectedPortfolioId');
        let portfolioToSelect = portfoliosList.find(p => p._id === lastSelectedId);
        
        // If last selected doesn't exist, use current selected or first one
        if (!portfolioToSelect) {
          portfolioToSelect = portfoliosList.find(p => p._id === selectedPortfolio?._id) || portfoliosList[0];
        }

        const url = `/api/portfolio/${portfolioToSelect._id}${showPremarket ? '?include_premarket=true' : ''}`;
        const detailedResponse = await axios.get(url);
        const updatedPortfolio = detailedResponse.data;

        // Update the portfolio in the list with the detailed data
        const updatedPortfolios = portfoliosList.map(p => 
          p._id === updatedPortfolio._id ? updatedPortfolio : p
        );

        setPortfolios(updatedPortfolios);
        setSelectedPortfolio(updatedPortfolio);
        
        // Save to localStorage
        localStorage.setItem('lastSelectedPortfolioId', updatedPortfolio._id);
      } else {
        setPortfolios(portfoliosList);
        setSelectedPortfolio(null);
        localStorage.removeItem('lastSelectedPortfolioId');
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch portfolios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createPortfolio = async (name) => {
    try {
      const response = await axios.post('/api/portfolio', { name });
      const newPortfolio = response.data;
      setPortfolios([...portfolios, newPortfolio]);
      setSelectedPortfolio(newPortfolio);
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
      
      const updatedPortfolios = portfolios.filter(p => p._id !== portfolioId);
      setPortfolios(updatedPortfolios);
      
      // If we deleted the selected portfolio, select another one
      if (selectedPortfolio?._id === portfolioId) {
        if (updatedPortfolios.length > 0) {
          const newSelected = updatedPortfolios[0];
          setSelectedPortfolio(newSelected);
          localStorage.setItem('lastSelectedPortfolioId', newSelected._id);
        } else {
          setSelectedPortfolio(null);
          localStorage.removeItem('lastSelectedPortfolioId');
        }
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to delete portfolio');
      console.error(err);
    }
  };

  const handleAddPosition = async (position) => {
    try {
      await axios.post(
        `/api/portfolio/${selectedPortfolio._id}/positions`,
        position
      );
      await fetchPortfolios(); // Refresh all portfolios with latest data
      setError(null);
    } catch (err) {
      setError('Failed to add position');
      console.error(err);
    }
  };

  const handleImportCSV = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await axios.post(
        `/api/portfolio/${selectedPortfolio._id}/import`,
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
      const response = await axios.post(`/api/portfolio/${selectedPortfolio._id}/consolidate`);
      
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

  const handlePortfolioChange = useCallback(async (portfolioId) => {
    try {
      const url = `/api/portfolio/${portfolioId}${showPremarket ? '?include_premarket=true' : ''}`;
      const response = await axios.get(url);
      const portfolio = response.data;
      setSelectedPortfolio(portfolio);
      setPortfolios(portfolios.map(p => 
        p._id === portfolio._id ? portfolio : p
      ));
      localStorage.setItem('lastSelectedPortfolioId', portfolioId);
      setError(null);
    } catch (err) {
      setError('Failed to fetch portfolio details');
      console.error(err);
    }
  }, [showPremarket, portfolios]);

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
        <h1>Portfolio Management</h1>
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