// BunkerWatch Sync Status Component
import React, { useState, useEffect } from 'react';
import { getPendingCounts, syncAllPendingData } from '../db/syncService';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

function SyncStatus({ lambdaUrl, vesselId }) {
  const isOnline = useOnlineStatus();
  const [pending, setPending] = useState({ soundings: 0, bunkering: 0, total: 0 });
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncMessage, setSyncMessage] = useState('');
  
  useEffect(() => {
    loadPendingCounts();
    const interval = setInterval(loadPendingCounts, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, []);
  
  async function loadPendingCounts() {
    try {
      const counts = await getPendingCounts();
      setPending(counts);
    } catch (error) {
      console.error('Error loading pending counts:', error);
    }
  }
  
  async function handleSync() {
    if (!isOnline) {
      setSyncMessage('⚠️ No internet connection');
      setTimeout(() => setSyncMessage(''), 3000);
      return;
    }
    
    if (!vesselId) {
      setSyncMessage('⚠️ No vessel selected');
      setTimeout(() => setSyncMessage(''), 3000);
      return;
    }
    
    setSyncing(true);
    setSyncMessage('Syncing data...');
    
    try {
      const results = await syncAllPendingData(lambdaUrl, vesselId);
      setLastSync(new Date());
      await loadPendingCounts();
      
      const totalSynced = results.soundings.success + results.bunkering.success;
      const totalFailed = results.soundings.failed + results.bunkering.failed;
      
      if (totalSynced > 0) {
        setSyncMessage(`✓ Synced ${totalSynced} record(s) successfully`);
      } else if (totalFailed > 0) {
        setSyncMessage(`✗ Failed to sync ${totalFailed} record(s)`);
      } else {
        setSyncMessage('✓ All data is up to date');
      }
      
      setTimeout(() => setSyncMessage(''), 5000);
      
    } catch (error) {
      setSyncMessage('✗ Sync failed: ' + error.message);
      setTimeout(() => setSyncMessage(''), 5000);
    } finally {
      setSyncing(false);
    }
  }
  
  return (
    <div className="sync-status-bar">
      <div className="sync-status-left">
        <div className={`connectivity ${isOnline ? 'online' : 'offline'}`}>
          <span className="status-dot"></span>
          {isOnline ? 'Online' : 'Offline'}
        </div>
        
        <div className="pending-count">
          <span className="pending-icon">📊</span>
          <span>Pending: {pending.total}</span>
          {pending.total > 0 && (
            <span className="pending-details">
              ({pending.soundings} soundings, {pending.bunkering} bunkering)
            </span>
          )}
        </div>
      </div>
      
      <div className="sync-status-right">
        {syncMessage && (
          <div className="sync-message">
            {syncMessage}
          </div>
        )}
        
        {pending.total > 0 && (
          <button 
            onClick={handleSync}
            disabled={!isOnline || syncing}
            className="sync-btn"
            title={!isOnline ? 'Cannot sync while offline' : 'Sync pending data to cloud'}
          >
            {syncing ? (
              <>
                <span className="spinner">⏳</span>
                Syncing...
              </>
            ) : (
              <>
                <span>🔄</span>
                Sync Now
              </>
            )}
          </button>
        )}
        
        {lastSync && !syncMessage && (
          <div className="last-sync">
            Last synced: {lastSync.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

export default SyncStatus;

