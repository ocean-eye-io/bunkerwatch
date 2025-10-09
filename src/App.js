import React, { useState, useMemo } from "react";
import "./App.css";

function App() {
  // Connection and compartments
  const [lambdaUrl, setLambdaUrl] = useState("");
  const [connected, setConnected] = useState(false);
  const [compartments, setCompartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sounding tab state
  const [activeTab, setActiveTab] = useState("sounding");
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [globalTrim, setGlobalTrim] = useState("");
  const [globalHeel, setGlobalHeel] = useState("");
  const fuelGrades = ["HSFO", "VLSFO", "ULSFO", "LSMGO", "MGO", "BIOFUEL"];
  const [tankEntries, setTankEntries] = useState([
    {
      id: Date.now(),
      compartment_id: "",
      fuel_grade: "",
      ullage: "",
      density: "",
      temp: "",
      result: null,
      loading: false,
      error: "",
    },
  ]);

  // Bunkering tab state
  const [numBunkers, setNumBunkers] = useState(1);
  const [bunkeringData, setBunkeringData] = useState([
    {
      id: 1,
      name: "Bunker 1",
      density: "",
      temp: "",
      totalQtyMT: "",
      heel: "",
      trim: "",
      entries: [
        {
          id: Date.now(),
          timestamp: new Date().toISOString().slice(0, 16),
          compartment_id: "",
          ullage: "",
          result: null,
          loading: false,
          error: "",
        },
      ],
    },
  ]);

  // Connect to Lambda and fetch compartments
  const connectToLambda = async () => {
    if (!lambdaUrl.trim()) {
      setError("Please enter Lambda Function URL");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(lambdaUrl + "/compartments", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.success) {
        setCompartments(data.data);
        setConnected(true);
        setError("");
      } else {
        setError(
          "Failed to fetch compartments: " + (data.error || "Unknown error")
        );
      }
    } catch (err) {
      setError("Connection failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // SOUNDING TAB LOGIC
  const updateTankEntry = (index, updates) => {
    setTankEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, ...updates } : entry))
    );
  };

  const addTankRow = () => {
    setTankEntries((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        compartment_id: "",
        fuel_grade: "",
        ullage: "",
        density: "",
        temp: "",
        result: null,
        loading: false,
        error: "",
      },
    ]);
  };

  const removeTankRow = (idToRemove) => {
    setTankEntries((prev) => prev.filter((entry) => entry.id !== idToRemove));
  };

  const fetchSoundingData = async (index) => {
    const entry = tankEntries[index];
    if (!entry.compartment_id || entry.ullage === "" || globalTrim === "") {
      updateTankEntry(index, {
        error: "Please select tank, enter ullage, and set global trim",
      });
      return;
    }
    updateTankEntry(index, { loading: true, error: "", result: null });
    try {
      const requestBody = {
        compartment_id: parseInt(entry.compartment_id),
        ullage: parseFloat(entry.ullage),
        trim: parseFloat(globalTrim),
      };
      if (globalHeel !== "" && globalHeel !== null) {
        requestBody.heel = parseFloat(globalHeel);
      }
      const response = await fetch(lambdaUrl + "/sounding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      if (data.success) {
        updateTankEntry(index, { result: data.data, error: "" });
      } else {
        updateTankEntry(index, {
          error: data.error || "Failed to fetch sounding data",
          result: null,
        });
      }
    } catch (err) {
      updateTankEntry(index, {
        error: "Request failed: " + err.message,
        result: null,
      });
    } finally {
      updateTankEntry(index, { loading: false });
    }
  };

  const formatVolumeDisplay = (result) => {
    if (!result) return "N/A";
    const displayVolume =
      result.final_volume !== undefined ? result.final_volume : result.volume;
    if (result.heel_correction !== undefined && result.heel_correction !== 0) {
      return (
        <div className="volume-with-heel">
          <div className="base-volume">
            Base: {parseFloat(result.base_volume).toFixed(2)}
          </div>
          <div className="heel-correction">
            Heel: {result.heel_correction > 0 ? "+" : ""}
            {parseFloat(result.heel_correction).toFixed(2)}
          </div>
          <div className="final-volume">
            <strong>Final: {parseFloat(displayVolume).toFixed(2)}</strong>
          </div>
        </div>
      );
    }
    return parseFloat(displayVolume).toFixed(2);
  };

  const calculateMT = (result, density) => {
    if (!result || !density || isNaN(parseFloat(density))) return "N/A";
    const volume =
      result.final_volume !== undefined ? result.final_volume : result.volume;
    if (isNaN(parseFloat(volume))) return "N/A";
    return (parseFloat(volume) * parseFloat(density)).toFixed(2);
  };

  const totalMtByFuelGrade = useMemo(() => {
    const totals = {};
    tankEntries.forEach((entry) => {
      if (entry.fuel_grade && entry.result && entry.density) {
        const mt = parseFloat(calculateMT(entry.result, entry.density));
        if (!isNaN(mt)) {
          totals[entry.fuel_grade] = (totals[entry.fuel_grade] || 0) + mt;
        }
      }
    });
    return totals;
  }, [tankEntries]);

  // BUNKERING TAB LOGIC
  const updateBunkerData = (bunkerIndex, updates) => {
    setBunkeringData((prev) =>
      prev.map((bunker, i) =>
        i === bunkerIndex ? { ...bunker, ...updates } : bunker
      )
    );
  };

  const addBunkeringEntry = (bunkerIndex) => {
    const newEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString().slice(0, 16),
      compartment_id: "",
      ullage: "",
      result: null,
      loading: false,
      error: "",
    };
    const currentBunker = bunkeringData[bunkerIndex];
    updateBunkerData(bunkerIndex, {
      entries: [...currentBunker.entries, newEntry],
    });
  };

  const updateBunkeringEntry = (bunkerIndex, entryIndex, updates) => {
    setBunkeringData((prev) =>
      prev.map((bunker, i) =>
        i === bunkerIndex
          ? {
              ...bunker,
              entries: bunker.entries.map((entry, j) =>
                j === entryIndex ? { ...entry, ...updates } : entry
              ),
            }
          : bunker
      )
    );
  };

  const removeBunkeringEntry = (bunkerIndex, entryId) => {
    const currentBunker = bunkeringData[bunkerIndex];
    const updatedEntries = currentBunker.entries.filter(
      (entry) => entry.id !== entryId
    );
    updateBunkerData(bunkerIndex, { entries: updatedEntries });
  };

  const fetchBunkeringData = async (bunkerIndex, entryIndex) => {
    const bunker = bunkeringData[bunkerIndex];
    const entry = bunker.entries[entryIndex];
    // Validation
    const isValidCompartment =
      entry.compartment_id && entry.compartment_id.toString().trim() !== "";
    const isValidUllage =
      entry.ullage !== "" &&
      entry.ullage !== null &&
      entry.ullage !== undefined &&
      entry.ullage.toString().trim() !== "";
    const isValidTrim =
      bunker.trim !== "" &&
      bunker.trim !== null &&
      bunker.trim !== undefined &&
      bunker.trim.toString().trim() !== "";
    if (!isValidCompartment || !isValidUllage || !isValidTrim) {
      const missingFields = [];
      if (!isValidCompartment) missingFields.push("tank");
      if (!isValidUllage) missingFields.push("ullage");
      if (!isValidTrim) missingFields.push("trim");
      updateBunkeringEntry(bunkerIndex, entryIndex, {
        error: `Please provide: ${missingFields.join(", ")}`,
      });
      return;
    }
    updateBunkeringEntry(bunkerIndex, entryIndex, {
      loading: true,
      error: "",
      result: null,
    });
    try {
      const requestBody = {
        compartment_id: parseInt(entry.compartment_id),
        ullage: parseFloat(entry.ullage),
        trim: parseFloat(bunker.trim),
      };
      if (bunker.heel && bunker.heel.toString().trim() !== "") {
        requestBody.heel = parseFloat(bunker.heel);
      }
      const response = await fetch(lambdaUrl + "/sounding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      if (data.success) {
        updateBunkeringEntry(bunkerIndex, entryIndex, {
          result: data.data,
          error: "",
        });
      } else {
        updateBunkeringEntry(bunkerIndex, entryIndex, {
          error: data.error || "Failed to fetch sounding data",
          result: null,
        });
      }
    } catch (err) {
      updateBunkeringEntry(bunkerIndex, entryIndex, {
        error: "Request failed: " + err.message,
        result: null,
      });
    } finally {
      updateBunkeringEntry(bunkerIndex, entryIndex, { loading: false });
    }
  };

  const calculateBunkeringMetrics = (bunker, entry) => {
    if (!entry.result || !bunker.density || bunker.density === "") return null;
    try {
      const volume =
        entry.result.final_volume !== undefined
          ? parseFloat(entry.result.final_volume)
          : parseFloat(entry.result.volume);
      const density = parseFloat(bunker.density);
      if (isNaN(volume) || isNaN(density)) return null;
      const mt = volume * density;
      const selectedTank = compartments.find(
        (comp) => comp.compartment_id === parseInt(entry.compartment_id)
      );
      const tankCapacity = selectedTank?.capacity || 1000;
      const percentFull = (volume / tankCapacity) * 100;
      return {
        volume: volume.toFixed(2),
        mt: mt.toFixed(2),
        percentFull: Math.min(percentFull, 100).toFixed(1),
      };
    } catch {
      return null;
    }
  };

  const updateNumBunkers = (num) => {
    setNumBunkers(num);
    const newBunkeringData = [];
    for (let i = 0; i < num; i++) {
      if (bunkeringData[i]) {
        newBunkeringData.push(bunkeringData[i]);
      } else {
        newBunkeringData.push({
          id: i + 1,
          name: `Bunker ${i + 1}`,
          density: "",
          temp: "",
          totalQtyMT: "",
          heel: "",
          trim: "",
          entries: [
            {
              id: Date.now() + i,
              timestamp: new Date().toISOString().slice(0, 16),
              compartment_id: "",
              ullage: "",
              result: null,
              loading: false,
              error: "",
            },
          ],
        });
      }
    }
    setBunkeringData(newBunkeringData);
  };

  const isCalculationEnabled = (bunker, entry) => {
    const hasCompartment =
      entry.compartment_id && entry.compartment_id.toString().trim() !== "";
    const hasUllage =
      entry.ullage !== "" &&
      entry.ullage !== null &&
      entry.ullage !== undefined &&
      entry.ullage.toString().trim() !== "";
    const hasTrim =
      bunker.trim !== "" &&
      bunker.trim !== null &&
      bunker.trim !== undefined &&
      bunker.trim.toString().trim() !== "";
    return hasCompartment && hasUllage && hasTrim && !entry.loading;
  };

  const resetConnection = () => {
    setConnected(false);
    setCompartments([]);
    setTankEntries([
      {
        id: Date.now(),
        compartment_id: "",
        fuel_grade: "",
        ullage: "",
        density: "",
        temp: "",
        result: null,
        loading: false,
        error: "",
      },
    ]);
    setError("");
    setGlobalTrim("");
    setGlobalHeel("");
    setReportDate(new Date().toISOString().slice(0, 10));
    setBunkeringData([
      {
        id: 1,
        name: "Bunker 1",
        density: "",
        temp: "",
        totalQtyMT: "",
        heel: "",
        trim: "",
        entries: [
          {
            id: Date.now(),
            timestamp: new Date().toISOString().slice(0, 16),
            compartment_id: "",
            ullage: "",
            result: null,
            loading: false,
            error: "",
          },
        ],
      },
    ]);
    setNumBunkers(1);
  };

  // UI
  if (!connected) {
    return (
      <div className="app">
        <div className="connection-container">
          <h1>Tank Sounding & Bunkering Calculator</h1>
          <div className="form-group">
            <label>Lambda Function URL</label>
            <input
              type="url"
              value={lambdaUrl}
              onChange={(e) => setLambdaUrl(e.target.value)}
              placeholder="https://your-lambda-url.lambda-url.region.on.aws"
            />
            <small>
              Enter your AWS Lambda Function URL (without trailing slash)
            </small>
          </div>
          <button
            onClick={connectToLambda}
            disabled={loading}
            className="connect-btn"
          >
            {loading ? "Connecting..." : "Connect & Load Compartments"}
          </button>
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="main-container">
        <div className="header">
          <h1>Tank Sounding & Bunkering Calculator</h1>
          <div className="connection-status">
            <span className="status-connected">
              ✅ Connected ({compartments.length} tanks loaded)
            </span>
            <button onClick={resetConnection} className="change-url-btn">
              Change URL
            </button>
          </div>
        </div>
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === "sounding" ? "active" : ""}`}
            onClick={() => setActiveTab("sounding")}
          >
            <span className="tab-icon">📊</span>
            Tank Sounding
          </button>
          <button
            className={`tab-btn ${activeTab === "bunkering" ? "active" : ""}`}
            onClick={() => setActiveTab("bunkering")}
          >
            <span className="tab-icon">⛽</span>
            Bunkering Monitor
          </button>
        </div>
        {/* Sounding Tab Content */}
        {activeTab === "sounding" && (
          <div className="tab-content">
            <div className="global-inputs">
              <div className="form-group">
                <label htmlFor="reportDate">Date:</label>
                <input
                  type="date"
                  id="reportDate"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="globalTrim">Global Trim (m):</label>
                <input
                  type="number"
                  id="globalTrim"
                  value={globalTrim}
                  onChange={(e) => setGlobalTrim(e.target.value)}
                  placeholder="e.g., 0.5"
                  step="0.1"
                  min="-4.0"
                  max="4.0"
                />
              </div>
              <div className="form-group">
                <label htmlFor="globalHeel">Global Heel (°):</label>
                <input
                  type="number"
                  id="globalHeel"
                  value={globalHeel}
                  onChange={(e) => setGlobalHeel(e.target.value)}
                  placeholder="e.g., 1.0 (Optional)"
                  step="0.1"
                  min="-3.0"
                  max="3.0"
                />
              </div>
            </div>
            <div className="content-grid">
              <div className="input-section">
                <h3>Tank Entries</h3>
                <table className="tank-table">
                  <thead>
                    <tr>
                      <th>Tank Name</th>
                      <th>Fuel Grade</th>
                      <th>Ullage (cm)</th>
                      <th>Density</th>
                      <th>Temp</th>
                      <th>Volume (m³)</th>
                      <th>mT</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tankEntries.map((entry, index) => (
                      <tr key={entry.id}>
                        <td>
                          <select
                            value={entry.compartment_id}
                            onChange={(e) =>
                              updateTankEntry(index, {
                                compartment_id: e.target.value,
                              })
                            }
                          >
                            <option value="">Select Tank</option>
                            {compartments.map((comp) => (
                              <option
                                key={comp.compartment_id}
                                value={comp.compartment_id}
                              >
                                {comp.compartment_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={entry.fuel_grade}
                            onChange={(e) =>
                              updateTankEntry(index, {
                                fuel_grade: e.target.value,
                              })
                            }
                          >
                            <option value="">Select Grade</option>
                            {fuelGrades.map((grade) => (
                              <option key={grade} value={grade}>
                                {grade}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={entry.ullage}
                            onChange={(e) =>
                              updateTankEntry(index, { ullage: e.target.value })
                            }
                            placeholder="Ullage"
                            step="0.1"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={entry.density}
                            onChange={(e) =>
                              updateTankEntry(index, {
                                density: e.target.value,
                              })
                            }
                            placeholder="Density"
                            step="0.001"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={entry.temp}
                            onChange={(e) =>
                              updateTankEntry(index, { temp: e.target.value })
                            }
                            placeholder="Temp"
                            step="0.1"
                          />
                        </td>
                        <td className="volume-cell">
                          {formatVolumeDisplay(entry.result)}
                        </td>
                        <td>{calculateMT(entry.result, entry.density)}</td>
                        <td>
                          <button
                            onClick={() => fetchSoundingData(index)}
                            disabled={entry.loading || globalTrim === ""}
                            className="calculate-row-btn"
                          >
                            {entry.loading ? "..." : "Calc"}
                          </button>
                          {tankEntries.length > 1 && (
                            <button
                              onClick={() => removeTankRow(entry.id)}
                              className="remove-row-btn"
                            >
                              -
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="add-row-container">
                  <button onClick={addTankRow} className="add-row-btn">
                    + Add Tank Row
                  </button>
                </div>
                {tankEntries.some((entry) => entry.error) && (
                  <div className="error-message">
                    {tankEntries
                      .map((entry) => entry.error)
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
              </div>
            </div>
            {/* Total mT by Fuel Grade Summary */}
            {Object.keys(totalMtByFuelGrade).length > 0 && (
              <div className="summary-section">
                <h3>Total Mass by Fuel Grade</h3>
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>Fuel Grade</th>
                      <th>Total mT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(totalMtByFuelGrade).map(
                      ([grade, total]) => (
                        <tr key={grade}>
                          <td>{grade}</td>
                          <td>{total.toFixed(2)} mT</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* Bunkering Tab Content */}
        {activeTab === "bunkering" && (
          <div className="tab-content">
            <div className="bunkering-header">
              <h3>Bunkering Operations Monitor</h3>
              <div className="bunker-controls">
                <label>Number of Bunkers:</label>
                <select
                  value={numBunkers}
                  onChange={(e) => updateNumBunkers(parseInt(e.target.value))}
                  className="bunker-select"
                >
                  <option value={1}>1 Bunker</option>
                  <option value={2}>2 Bunkers</option>
                </select>
              </div>
            </div>
            <div className={`bunkers-grid bunkers-${numBunkers}`}>
              {bunkeringData.slice(0, numBunkers).map((bunker, bunkerIndex) => (
                <div key={bunker.id} className="bunker-panel">
                  <div className="bunker-header">
                    <h4>{bunker.name}</h4>
                    <div className="bunker-status">
                      <span className="status-indicator active"></span>
                      Active
                    </div>
                  </div>
                  <div className="bunker-inputs">
                    <div className="input-row">
                      <div className="form-group">
                        <label>Density:</label>
                        <input
                          type="number"
                          value={bunker.density}
                          onChange={(e) =>
                            updateBunkerData(bunkerIndex, {
                              density: e.target.value,
                            })
                          }
                          placeholder="0.950"
                          step="0.001"
                        />
                      </div>
                      <div className="form-group">
                        <label>Temp (°C):</label>
                        <input
                          type="number"
                          value={bunker.temp}
                          onChange={(e) =>
                            updateBunkerData(bunkerIndex, {
                              temp: e.target.value,
                            })
                          }
                          placeholder="15.0"
                          step="0.1"
                        />
                      </div>
                      <div className="form-group">
                        <label>Total Qty (mT):</label>
                        <input
                          type="number"
                          value={bunker.totalQtyMT}
                          onChange={(e) =>
                            updateBunkerData(bunkerIndex, {
                              totalQtyMT: e.target.value,
                            })
                          }
                          placeholder="500"
                          step="1"
                        />
                      </div>
                    </div>
                    <div className="input-row">
                      <div className="form-group">
                        <label>Heel (°):</label>
                        <input
                          type="number"
                          value={bunker.heel}
                          onChange={(e) =>
                            updateBunkerData(bunkerIndex, {
                              heel: e.target.value,
                            })
                          }
                          placeholder="0.0"
                          step="0.1"
                        />
                      </div>
                      <div className="form-group">
                        <label>Trim (m):</label>
                        <input
                          type="number"
                          value={bunker.trim}
                          onChange={(e) =>
                            updateBunkerData(bunkerIndex, {
                              trim: e.target.value,
                            })
                          }
                          placeholder="0.5"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bunker-table-container">
                    <table className="bunker-table">
                      <thead>
                        <tr>
                          <th>Date/Time</th>
                          <th>Tank</th>
                          <th>Ullage (cm)</th>
                          <th>Volume (m³)</th>
                          <th>mT</th>
                          <th>% Full</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bunker.entries.map((entry, entryIndex) => {
                          const metrics =
                            entry.result && bunker.density
                              ? calculateBunkeringMetrics(bunker, entry)
                              : null;
                          return (
                            <tr key={entry.id}>
                              <td>
                                <input
                                  type="datetime-local"
                                  value={entry.timestamp}
                                  onChange={(e) =>
                                    updateBunkeringEntry(
                                      bunkerIndex,
                                      entryIndex,
                                      {
                                        timestamp: e.target.value,
                                      }
                                    )
                                  }
                                  className="timestamp-input"
                                />
                              </td>
                              <td>
                                <select
                                  value={entry.compartment_id}
                                  onChange={(e) =>
                                    updateBunkeringEntry(
                                      bunkerIndex,
                                      entryIndex,
                                      {
                                        compartment_id: e.target.value,
                                      }
                                    )
                                  }
                                >
                                  <option value="">Select Tank</option>
                                  {compartments.map((comp) => (
                                    <option
                                      key={comp.compartment_id}
                                      value={comp.compartment_id}
                                    >
                                      {comp.compartment_name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  value={entry.ullage}
                                  onChange={(e) =>
                                    updateBunkeringEntry(
                                      bunkerIndex,
                                      entryIndex,
                                      {
                                        ullage: e.target.value,
                                      }
                                    )
                                  }
                                  placeholder="Ullage"
                                  step="0.1"
                                />
                              </td>
                              <td className="metric-cell">
                                {entry.result ? (
                                  <span className="volume-value">
                                    {(() => {
                                      const volume =
                                        entry.result.final_volume !== undefined
                                          ? entry.result.final_volume
                                          : entry.result.volume;
                                      return parseFloat(volume).toFixed(2);
                                    })()}
                                  </span>
                                ) : (
                                  <span className="no-data">-</span>
                                )}
                              </td>
                              <td className="metric-cell">
                                {metrics ? (
                                  <span className="mt-value">{metrics.mt}</span>
                                ) : (
                                  <span className="no-data">-</span>
                                )}
                              </td>
                              <td className="percent-cell">
                                {metrics ? (
                                  <div className="percent-display">
                                    <span>{metrics.percentFull}%</span>
                                    <div className="percent-bar">
                                      <div
                                        className="percent-fill"
                                        style={{
                                          width: `${Math.min(
                                            parseFloat(metrics.percentFull),
                                            100
                                          )}%`,
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="no-data">-</span>
                                )}
                              </td>
                              <td>
                                <button
                                  onClick={() =>
                                    fetchBunkeringData(bunkerIndex, entryIndex)
                                  }
                                  disabled={
                                    !isCalculationEnabled(bunker, entry)
                                  }
                                  className="calculate-row-btn"
                                >
                                  {entry.loading ? "..." : "Calc"}
                                </button>
                                {bunker.entries.length > 1 && (
                                  <button
                                    onClick={() =>
                                      removeBunkeringEntry(
                                        bunkerIndex,
                                        entry.id
                                      )
                                    }
                                    className="remove-row-btn"
                                  >
                                    -
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="add-row-container">
                      <button
                        onClick={() => addBunkeringEntry(bunkerIndex)}
                        className="add-row-btn"
                      >
                        + Add Reading
                      </button>
                    </div>
                    {bunker.entries.some((entry) => entry.error) && (
                      <div className="error-message">
                        {bunker.entries
                          .map((entry) => entry.error)
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
