// BunkerWatch Vessel Data Hook
import { useState, useEffect } from 'react';
import { getVesselInfo, hasVesselData } from '../db/database';

/**
 * Hook to manage vessel data state
 */
export function useVesselData() {
  const [vessel, setVessel] = useState(null);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const loadVesselData = async () => {
    setLoading(true);
    try {
      const vesselInfo = await getVesselInfo();
      const dataAvailable = await hasVesselData();
      
      setVessel(vesselInfo);
      setHasData(dataAvailable);
    } catch (error) {
      console.error('Error loading vessel data:', error);
      setVessel(null);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadVesselData();
  }, []);
  
  return {
    vessel,
    hasData,
    loading,
    reload: loadVesselData
  };
}

export default useVesselData;

