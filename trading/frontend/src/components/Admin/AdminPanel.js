import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../Auth/AuthContext';
import ApiStats from './ApiStats';
import './AdminPanel.css';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
      fetchPortfolios();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/auth/users');
      setUsers(response.data);
    } catch (error) {
      setError('Failed to fetch users');
    }
  };

  const fetchPortfolios = async () => {
    try {
      const response = await axios.get('/api/portfolio');
      setPortfolios(response.data);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch portfolios');
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await axios.put(`/api/auth/users/${userId}/status`, {
        isActive: !currentStatus
      });
      fetchUsers();
    } catch (error) {
      setError('Failed to update user status');
    }
  };

  const changeUserRole = async (userId, newRole) => {
    try {
      await axios.put(`/api/auth/users/${userId}/role`, {
        role: newRole
      });
      fetchUsers();
    } catch (error) {
      setError('Failed to update user role');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="admin-panel">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loading">Loading admin data...</div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <div className="admin-tabs">
          <button 
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            Users ({users.length})
          </button>
          <button 
            className={activeTab === 'portfolios' ? 'active' : ''}
            onClick={() => setActiveTab('portfolios')}
          >
            All Portfolios ({portfolios.length})
          </button>
          <button 
            className={activeTab === 'api-stats' ? 'active' : ''}
            onClick={() => setActiveTab('api-stats')}
          >
            API Statistics
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {activeTab === 'users' && (
        <div className="users-section">
          <h2>User Management</h2>
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.firstName} {user.lastName}</td>
                    <td>
                      <select 
                        value={user.role} 
                        onChange={(e) => changeUserRole(user._id, e.target.value)}
                        className="role-select"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`status ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <button 
                        onClick={() => toggleUserStatus(user._id, user.isActive)}
                        className={`action-btn ${user.isActive ? 'deactivate' : 'activate'}`}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'portfolios' && (
        <div className="portfolios-section">
          <h2>All User Portfolios</h2>
          <div className="portfolios-grid">
            {portfolios.map(portfolio => (
              <div key={portfolio._id} className="portfolio-card">
                <div className="portfolio-header">
                  <h3>{portfolio.name}</h3>
                  <div className="portfolio-owner">
                    Owner: {portfolio.userId?.username || 'Unknown'}
                    {portfolio.userId?.email && (
                      <span className="owner-email">({portfolio.userId.email})</span>
                    )}
                  </div>
                </div>
                
                <div className="portfolio-stats">
                  <div className="stat">
                    <span className="label">Positions:</span>
                    <span className="value">{portfolio.positions?.length || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Cash:</span>
                    <span className="value">{formatCurrency(portfolio.cash)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Created:</span>
                    <span className="value">{formatDate(portfolio.createdAt)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Updated:</span>
                    <span className="value">{formatDate(portfolio.updatedAt)}</span>
                  </div>
                </div>

                {portfolio.positions && portfolio.positions.length > 0 && (
                  <div className="portfolio-positions">
                    <h4>Top Holdings:</h4>
                    <div className="positions-list">
                      {portfolio.positions.slice(0, 5).map((position, index) => (
                        <div key={index} className="position-item">
                          <span className="symbol">{position.symbol}</span>
                          <span className="shares">{position.shares} shares</span>
                          <span className="cost">{formatCurrency(position.averageCost)}</span>
                        </div>
                      ))}
                      {portfolio.positions.length > 5 && (
                        <div className="more-positions">
                          +{portfolio.positions.length - 5} more positions
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'api-stats' && (
        <ApiStats />
      )}
    </div>
  );
};

export default AdminPanel; 