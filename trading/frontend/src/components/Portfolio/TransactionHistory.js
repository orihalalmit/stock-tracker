import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './TransactionHistory.css';

const TransactionHistory = ({ portfolioId }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, buy, sell
  const [sortBy, setSortBy] = useState('date'); // date, symbol, shares, price
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await axios.get(`/api/portfolio/${portfolioId}/transactions`);
      setTransactions(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch transactions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

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
    }).format(value);
  };

  const sortTransactions = (transactions) => {
    return [...transactions].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return sortOrder === 'asc'
            ? new Date(a.date) - new Date(b.date)
            : new Date(b.date) - new Date(a.date);
        case 'symbol':
          return sortOrder === 'asc'
            ? a.symbol.localeCompare(b.symbol)
            : b.symbol.localeCompare(a.symbol);
        case 'shares':
          return sortOrder === 'asc'
            ? a.shares - b.shares
            : b.shares - a.shares;
        case 'price':
          return sortOrder === 'asc'
            ? a.price - b.price
            : b.price - a.price;
        default:
          return 0;
      }
    });
  };

  const filterTransactions = (transactions) => {
    if (filter === 'all') return transactions;
    return transactions.filter(t => t.type.toLowerCase() === filter);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return <div className="transactions-loading">Loading transactions...</div>;
  }

  if (error) {
    return <div className="transactions-error">{error}</div>;
  }

  const filteredAndSortedTransactions = sortTransactions(filterTransactions(transactions));

  return (
    <div className="transaction-history">
      <div className="transactions-header">
        <h3>Transaction History</h3>
        <div className="transactions-filters">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Transactions</option>
            <option value="buy">Buy Orders</option>
            <option value="sell">Sell Orders</option>
          </select>
        </div>
      </div>

      <div className="transactions-table-container">
        <table className="transactions-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('date')} className={sortBy === 'date' ? 'active' : ''}>
                Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('symbol')} className={sortBy === 'symbol' ? 'active' : ''}>
                Symbol {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Type</th>
              <th onClick={() => handleSort('shares')} className={sortBy === 'shares' ? 'active' : ''}>
                Shares {sortBy === 'shares' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('price')} className={sortBy === 'price' ? 'active' : ''}>
                Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedTransactions.map((transaction) => (
              <tr key={transaction._id}>
                <td>{formatDate(transaction.date)}</td>
                <td className="symbol">{transaction.symbol}</td>
                <td className={`type ${transaction.type.toLowerCase()}`}>
                  {transaction.type}
                </td>
                <td className="shares">{transaction.shares}</td>
                <td className="price">{formatCurrency(transaction.price)}</td>
                <td className="total">{formatCurrency(transaction.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedTransactions.length === 0 && (
        <div className="no-transactions">
          <p>No transactions found</p>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory; 