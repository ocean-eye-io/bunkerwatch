// BunkerWatch Vessel Selection Component
import React, { useState, useEffect } from 'react';
import { getVesselInfo } from '../db/database';
import { downloadVesselDataPackage, fetchVessels } from '../db/dataPackageService';

function VesselSelection({ lambdaUrl, onVesselSelected, onBack }) {
  const [vessels, setVessels] = useState([]);
  const [selectedVesselId, setSelectedVesselId] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [error, setError] = useState('');
  const [currentVessel, setCurrentVessel] = useState(null);
  
  useEffect(() => {
    loadCurrentVessel();
    loadVessels();
  }, []);
  
  async function loadCurrentVessel() {
    const vessel = await getVesselInfo();
    setCurrentVessel(vessel);
    if (vessel) {
      onVesselSelected(vessel);
    }
  }
  
  async function loadVessels() {
    setLoading(true);
    setError('');
    try {
      const vesselList = await fetchVessels(lambdaUrl);
      setVessels(vesselList);
    } catch (err) {
      setError('Failed to load vessels: ' + err.message);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleDownloadData() {
    if (!selectedVesselId) {
      setError('Please select a vessel');
      return;
    }
    
    setDownloading(true);
    setError('');
    setDownloadProgress('Connecting to server...');
    
    try {
      setDownloadProgress('Downloading vessel data...');
      const result = await downloadVesselDataPackage(lambdaUrl, selectedVesselId);
      
      setDownloadProgress('Processing calibration data...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setDownloadProgress('✓ Download complete!');
      await loadCurrentVessel();
      
      setTimeout(() => {
        setDownloadProgress('');
      }, 2000);
      
    } catch (err) {
      setError('Download failed: ' + err.message);
      setDownloadProgress('');
    } finally {
      setDownloading(false);
    }
  }
  
  function handleChangeVessel() {
    setCurrentVessel(null);
    setSelectedVesselId('');
    setError('');
  }
  
  if (currentVessel) {
    return (
      <div className="vessel-info-banner">
        <div className="vessel-current">
          <div className="vessel-icon">🚢</div>
          <div className="vessel-details">
            <h3>{currentVessel.vessel_name}</h3>
            <p className="vessel-meta">
              <span>IMO: {currentVessel.imo_number}</span>
              <span>•</span>
              <span>Package v{currentVessel.package_version}</span>
              <span>•</span>
              <span>Downloaded: {new Date(currentVessel.downloaded_at).toLocaleDateString()}</span>
            </p>
          </div>
          {/* <button 
            onClick={handleChangeVessel}
            className="change-vessel-btn"
          >
            Change Vessel
          </button> */}
        </div>
      </div>
    );
  }
  
  return (
    <div className="vessel-selection-container">
      <div className="vessel-selection-header">
        <div className="header-icon">⚓</div>
        <div>
          <h2>Select Vessel</h2>
          <p>Choose your vessel and download calibration data for offline use</p>
        </div>
      </div>
      
      <div className="vessel-selection-form">
        <div className="form-group">
          <label>Vessel:</label>
          <select 
            value={selectedVesselId}
            onChange={(e) => setSelectedVesselId(e.target.value)}
            disabled={loading || downloading}
            className="vessel-select"
          >
            <option value="">-- Select Vessel --</option>
            {vessels.map(v => (
              <option key={v.vessel_id} value={v.vessel_id}>
                {v.vessel_name} ({v.imo_number || 'No IMO'})
              </option>
            ))}
          </select>
        </div>
        
        <button 
          onClick={handleDownloadData}
          disabled={!selectedVesselId || downloading || loading}
          className="download-btn"
        >
          {downloading ? (
            <>
              <span className="spinner">⏳</span>
              Downloading...
            </>
          ) : (
            <>
              <span>📦</span>
              Download Vessel Data
            </>
          )}
        </button>
        
        {downloadProgress && (
          <div className="download-progress">
            {downloadProgress}
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        {onBack && (
          <button onClick={onBack} className="back-btn">
            ← Back to Connection
          </button>
        )}
      </div>
      
      <div className="info-box">
        <h4>📋 Setup Information</h4>
        <ul>
          <li>⚓ <strong>First time setup:</strong> Download vessel-specific tank calibration data</li>
          <li>📦 <strong>Package size:</strong> ~2-5 MB (depends on number of tanks)</li>
          <li>📶 <strong>Internet required:</strong> One-time download only</li>
          <li>💾 <strong>Offline ready:</strong> Data stored locally for offline use</li>
          <li>🔄 <strong>Works offline:</strong> Calculate soundings without internet</li>
        </ul>
      </div>
    </div>
  );
}

export default VesselSelection;

