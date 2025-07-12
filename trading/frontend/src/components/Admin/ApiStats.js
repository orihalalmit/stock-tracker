import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ApiStats.css';

const ApiStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/stats');
      setStats(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch API statistics');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh stats every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="api-stats">
        <div className="stats-header">
          <h2>API Statistics</h2>
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="api-stats">
        <div className="stats-header">
          <h2>API Statistics</h2>
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  const { rateLimiter, cache } = stats;

  return (
    <div className="api-stats">
      <div className="stats-header">
        <h2>API Statistics</h2>
        <button onClick={fetchStats} className="refresh-button">
          Refresh
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Rate Limiter</h3>
          <div className="stat-item">
            <span className="stat-label">Queue Length:</span>
            <span className="stat-value">{rateLimiter.queueLength}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Requests (last minute):</span>
            <span className="stat-value">{rateLimiter.requestCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Status:</span>
            <span className={`stat-value ${rateLimiter.queueLength > 0 ? 'warning' : 'success'}`}>
              {rateLimiter.queueLength > 0 ? 'Queued' : 'Ready'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <h3>Cache</h3>
          <div className="stat-item">
            <span className="stat-label">Total Entries:</span>
            <span className="stat-value">{cache.total}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Valid Entries:</span>
            <span className="stat-value">{cache.valid}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Expired Entries:</span>
            <span className="stat-value">{cache.expired}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Hit Rate:</span>
            <span className="stat-value">
              {cache.total > 0 ? Math.round((cache.valid / cache.total) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      <div className="stats-info">
        <h3>Rate Limiting Information</h3>
        <ul>
          <li>Maximum requests per minute: 180</li>
          <li>Requests are queued when rate limit is approached</li>
          <li>Automatic retry with exponential backoff on 429 errors</li>
          <li>Bulk requests are split into smaller batches</li>
        </ul>

        <h3>Caching Information</h3>
        <ul>
          <li>Stock snapshots cached for 30 seconds</li>
          <li>Historical bars cached for 1 minute</li>
          <li>Cache reduces API calls and improves response times</li>
          <li>Automatic cleanup of expired entries</li>
        </ul>
      </div>
    </div>
  );
};

export default ApiStats; 