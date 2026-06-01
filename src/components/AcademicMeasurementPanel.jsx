/**
 * AcademicMeasurementPanel.jsx
 * 
 * Educational interface for exploring ANSUR II dataset and applying
 * subject measurements to the 3D anatomy model.
 * 
 * Features:
 *   - Population statistics visualization
 *   - Subject browser & filtering
 *   - Real-time measurement display
 *   - Percentile comparisons
 *   - Educational information
 */

import { useEffect, useState, useRef } from 'react'
import { ANSURDataLoader, KEY_MEASUREMENTS } from '../utils/ANSURDataLoader'
import { SubjectMeasurementScaler } from '../utils/SubjectMeasurementScaler'
import './AcademicMeasurementPanel.css'

export default function AcademicMeasurementPanel({ skeletonScene, muscleScene, visible = true }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedMeasurement, setSelectedMeasurement] = useState('stature')
  const [filterMin, setFilterMin] = useState('')
  const [filterMax, setFilterMax] = useState('')
  const [filteredSubjects, setFilteredSubjects] = useState([])
  const [showStats, setShowStats] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const scalerRef = useRef(null)

  // Initialize data loader
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true)
      const loader = new ANSURDataLoader()
      const count = await loader.load('/ANSUR_II_MALE_Public.csv')
      
      if (count > 0) {
        setData(loader)
        // Create scaler with baseline stats
        const baselineStats = {}
        for (const { key } of KEY_MEASUREMENTS) {
          const stats = loader.getStats(key)
          if (stats) baselineStats[key] = { mean: stats.mean, sd: stats.sd }
        }
        scalerRef.current = new SubjectMeasurementScaler(
          skeletonScene,
          muscleScene,
          baselineStats
        )
      }
      setLoading(false)
    }

    if (skeletonScene && muscleScene) {
      initializeData()
    }
  }, [skeletonScene, muscleScene])

  // Handle subject selection
  const handleSelectSubject = (index) => {
    if (!data) return
    
    setSelectedSubject(index)
    const subject = data.getSubject(index)
    const measurements = {}
    for (const { key } of KEY_MEASUREMENTS) {
      measurements[key] = subject[key]
    }
    
    if (scalerRef.current) {
      scalerRef.current.applyMeasurements(measurements)
    }
  }

  // Handle random subject
  const handleRandomSubject = () => {
    if (!data) return
    const { index } = data.getRandomSubject()
    handleSelectSubject(index)
  }

  // Handle filtering
  const handleFilter = () => {
    if (!data || !selectedMeasurement) return
    
    const stats = data.getStats(selectedMeasurement)
    if (!stats) return
    
    const min = filterMin === '' ? stats.min : parseFloat(filterMin)
    const max = filterMax === '' ? stats.max : parseFloat(filterMax)
    
    const filtered = data.filterByMeasurement(selectedMeasurement, min, max)
    setFilteredSubjects(filtered)
  }

  const handleResetFilter = () => {
    setFilteredSubjects([])
    setFilterMin('')
    setFilterMax('')
  }

  if (!visible) return null

  if (loading) {
    return (
      <div className="academic-panel loading">
        <div className="spinner"></div>
        <p>Loading ANSUR II dataset...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="academic-panel error">
        <p>Failed to load dataset</p>
      </div>
    )
  }

  const allStats = data.getAllStats()
  const selectedStats = allStats.find(s => s.key === selectedMeasurement)
  const subjectCount = data.getSubjectCount()

  // Subjects to display (filtered or all)
  const subjectsToShow = filteredSubjects.length > 0 
    ? filteredSubjects 
    : data.subjects.slice(0, 50) // Show first 50 by default

  return (
    <div className="academic-panel">
      {/* Header */}
      <div className="ap-header">
        <h3>ANSUR II Data Explorer</h3>
        <p className="ap-subtitle">Interactive Anatomical Dataset ({subjectCount} subjects)</p>
      </div>

      {/* Tabs */}
      <div className="ap-tabs">
        <button
          className={`ap-tab ${showStats ? 'active' : ''}`}
          onClick={() => { setShowStats(true); setShowFilters(false) }}
        >
          Statistics
        </button>
        <button
          className={`ap-tab ${showFilters ? 'active' : ''}`}
          onClick={() => { setShowStats(false); setShowFilters(true) }}
        >
          Browser
        </button>
      </div>

      <div className="ap-content">
        {/* Statistics View */}
        {showStats && (
          <div className="ap-stats-view">
            <div className="ap-stat-selector">
              <label>Measurement:</label>
              <select 
                value={selectedMeasurement}
                onChange={(e) => {
                  setSelectedMeasurement(e.target.value)
                  handleResetFilter()
                }}
              >
                {allStats.map(s => (
                  <option key={s.key} value={s.key}>
                    {s.label} ({s.unit})
                  </option>
                ))}
              </select>
            </div>

            {selectedStats && (
              <div className="ap-stat-display">
                <div className="ap-stat-row">
                  <span className="ap-stat-label">Mean:</span>
                  <span className="ap-stat-value">{selectedStats.stats.mean.toFixed(1)} {selectedStats.unit}</span>
                </div>
                <div className="ap-stat-row">
                  <span className="ap-stat-label">Std Dev:</span>
                  <span className="ap-stat-value">±{selectedStats.stats.sd.toFixed(1)}</span>
                </div>
                <div className="ap-stat-row">
                  <span className="ap-stat-label">Range:</span>
                  <span className="ap-stat-value">
                    {selectedStats.stats.min.toFixed(0)} – {selectedStats.stats.max.toFixed(0)}
                  </span>
                </div>
                <div className="ap-stat-row">
                  <span className="ap-stat-label">Sample Size:</span>
                  <span className="ap-stat-value">{selectedStats.stats.count}</span>
                </div>

                {/* Distribution Info */}
                <div className="ap-distribution-info">
                  <p><strong>Understanding the Distribution:</strong></p>
                  <ul>
                    <li>The mean represents the average across all {subjectCount} male soldiers</li>
                    <li>Std Dev shows typical variation (68% within ±1 SD)</li>
                    <li>Real populations don't fit fixed percentiles—this is actual data</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Browser View */}
        {showFilters && (
          <div className="ap-browser-view">
            {/* Filtering Section */}
            <div className="ap-filter-section">
              <h4>Filter Subjects</h4>
              <div className="ap-filter-row">
                <label>{selectedStats?.label}:</label>
                <input
                  type="number"
                  placeholder="Min"
                  value={filterMin}
                  onChange={(e) => setFilterMin(e.target.value)}
                />
                <span className="ap-to">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filterMax}
                  onChange={(e) => setFilterMax(e.target.value)}
                />
              </div>

              <div className="ap-filter-buttons">
                <button className="ap-btn-primary" onClick={handleFilter}>
                  Filter ({filteredSubjects.length})
                </button>
                <button className="ap-btn-secondary" onClick={handleResetFilter}>
                  Reset
                </button>
                <button className="ap-btn-secondary" onClick={handleRandomSubject}>
                  Random Subject
                </button>
              </div>
            </div>

            {/* Subject List */}
            <div className="ap-subject-list">
              <h4>Subjects ({subjectsToShow.length})</h4>
              <div className="ap-subject-grid">
                {subjectsToShow.map((subject, idx) => {
                  const displayIdx = data.subjects.indexOf(subject)
                  const subjectStature = subject.stature
                  const isSelected = selectedSubject === displayIdx
                  
                  return (
                    <div
                      key={displayIdx}
                      className={`ap-subject-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectSubject(displayIdx)}
                      title={`${subject.Ethnicity || 'Unknown'} • Age ${subject.Age || '?'}`}
                    >
                      <div className="ap-subject-id">#{subject.subjectid}</div>
                      <div className="ap-subject-height">
                        {subjectStature ? `${subjectStature}mm` : 'N/A'}
                      </div>
                      <div className="ap-subject-eth">
                        {subject.Ethnicity || 'Unknown'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Subject Details */}
      {selectedSubject !== null && (
        <div className="ap-details">
          <h4>Subject #{data.getSubject(selectedSubject)?.subjectid} Measurements</h4>
          <div className="ap-measurements-list">
            {data.getSubjectMeasurements(selectedSubject).map(m => (
              <div key={m.key} className="ap-measurement-item">
                <span className="ap-m-label">{m.label}</span>
                <span className="ap-m-value">{m.value?.toFixed(0) || '—'} {m.unit}</span>
                <span className="ap-m-percentile">{m.percentile}th %ile</span>
              </div>
            ))}
          </div>
          
          <button 
            className="ap-btn-primary"
            onClick={() => {
              if (scalerRef.current) scalerRef.current.reset()
              setSelectedSubject(null)
            }}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Educational Footer */}
      <div className="ap-footer">
        <p>
          <strong>Tip:</strong> Select a subject to scale the 3D model to their actual measurements. 
          Compare different subjects to see real anatomical variation in the population.
        </p>
      </div>
    </div>
  )
}
