import React, { useRef, useState } from 'react';
import './ImportCSV.css';

const ImportCSV = ({ onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setError('');

    const file = e.dataTransfer.files[0];
    if (validateFile(file)) {
      onImport(file);
      setIsOpen(false);
    }
  };

  const handleFileSelect = (e) => {
    setError('');
    const file = e.target.files[0];
    if (validateFile(file)) {
      onImport(file);
      setIsOpen(false);
    }
  };

  const validateFile = (file) => {
    if (!file) {
      return false;
    }

    if (file.type !== 'text/csv') {
      setError('Please upload a CSV file');
      return false;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('File size should be less than 5MB');
      return false;
    }

    return true;
  };

  if (!isOpen) {
    return (
      <div className="import-csv-widget">
        <button 
          className="import-csv-button"
          onClick={() => setIsOpen(true)}
        >
          <span className="button-icon">📊</span>
          <span className="button-text">Import CSV</span>
        </button>
      </div>
    );
  }

  return (
    <div className="import-csv-inline-form">
      <div className="inline-form-header">
        <h3>📊 Import Portfolio CSV</h3>
        <button 
          className="collapse-button"
          onClick={() => setIsOpen(false)}
          title="Collapse"
        >
          ▲ Collapse
        </button>
      </div>
      
      {error && (
        <div className="form-error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="import-csv-content">
        <div
          className={`dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="dropzone-content">
            <div className="upload-icon">📄</div>
            <p className="upload-text">
              Drag & drop a CSV file here<br />
              or click to select
            </p>
            <p className="upload-hint">
              CSV should include: symbol, shares, averagePrice, sector
            </p>
          </div>
        </div>

        <div className="csv-template">
          <p className="template-text">
            Download template:
            <button
              className="template-button"
              onClick={() => {
                const template = 'symbol,shares,averagePrice,sector\nAAPL,100,150.50,Technology\nGOOGL,50,2800.75,Technology';
                const blob = new Blob([template], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'portfolio_template.csv';
                a.click();
                window.URL.revokeObjectURL(url);
              }}
            >
              portfolio_template.csv
            </button>
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default ImportCSV; 