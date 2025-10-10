// BunkerWatch Settings Component
import React, { useState } from 'react';
import { getLambdaUrl, saveLambdaUrl, clearLambdaUrl, getAppConfig } from '../config';

function Settings({ onClose, onLambdaUrlUpdated }) {
  const [lambdaUrl, setLambdaUrl] = useState(getLambdaUrl() || '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const config = getAppConfig();
  
  const handleSave = () => {
    if (!lambdaUrl.trim()) {
      setError('Lambda URL cannot be empty');
      return;
    }
    
    try {
      // Validate URL
      const url = new URL(lambdaUrl);
      if (!url.protocol.startsWith('http')) {
        throw new Error('Invalid URL protocol');
      }
      
      saveLambdaUrl(lambdaUrl);
      setSaved(true);
      setError('');
      
      // Notify parent
      if (onLambdaUrlUpdated) {
        onLambdaUrlUpdated(lambdaUrl);
      }
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);
      
    } catch (err) {
      setError('Invalid URL: ' + err.message);
      setSaved(false);
    }
  };
  
  const handleReset = () => {
    clearLambdaUrl();
    setLambdaUrl('');
    setSaved(false);
    setError('');
  };
  
  const defaultUrl = process.env.REACT_APP_LAMBDA_URL || 'Not configured';
  
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <div className="settings-content">
          <div className="settings-section">
            <h3>Lambda Configuration</h3>
            
            <div className="form-group">
              <label>Lambda Function URL:</label>
              <input 
                type="url"
                value={lambdaUrl}
                onChange={(e) => {
                  setLambdaUrl(e.target.value);
                  setSaved(false);
                  setError('');
                }}
                placeholder="https://your-lambda-url.lambda-url.region.on.aws"
                className="settings-input"
              />
              <small className="help-text">
                Enter your AWS Lambda Function URL for vessel data and sync
              </small>
            </div>
            
            {saved && (
              <div className="success-message">
                ✓ Lambda URL saved successfully!
              </div>
            )}
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            <div className="button-group">
              <button onClick={handleSave} className="btn-primary">
                💾 Save Configuration
              </button>
              <button onClick={handleReset} className="btn-secondary">
                🔄 Reset to Default
              </button>
            </div>
          </div>
          
          <div className="settings-section">
            <h3>Configuration Info</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Default URL:</span>
                <span className="info-value">{defaultUrl}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Current URL:</span>
                <span className="info-value">
                  {getLambdaUrl() ? '✅ Configured' : '❌ Not set'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">App Version:</span>
                <span className="info-value">{config.version}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Environment:</span>
                <span className="info-value">
                  {process.env.NODE_ENV === 'production' ? '🚀 Production' : '🔧 Development'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="settings-section">
            <h3>About BunkerWatch</h3>
            <p className="about-text">
              Professional maritime fuel management system for tank sounding and bunkering operations.
              Designed for offline-first operation with cloud sync capabilities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;

