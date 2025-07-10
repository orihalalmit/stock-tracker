import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import './AuthForm.css';

const LoginForm = ({ onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.username, formData.password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-form">
      <h2>Login to Trading App</h2>
      


      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username or Email</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            placeholder="Enter your username or email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Enter your password"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading} className="auth-button">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="sample-portfolio-info">
        <h4>🎯 What you get when you register:</h4>
        <ul>
          <li>🚀 A sample portfolio with popular tech stocks</li>
          <li>📊 Real-time portfolio tracking and insights</li>
          <li>💰 $2,500 starting cash balance</li>
          <li>📈 10 diversified positions to explore</li>
        </ul>
      </div>

      <div className="auth-switch">
        <p>Don't have an account? 
          <button 
            type="button" 
            onClick={onSwitchToRegister}
            className="link-button"
          >
            Register here
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginForm; 