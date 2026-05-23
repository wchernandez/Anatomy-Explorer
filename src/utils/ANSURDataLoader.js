/**
 * ANSURDataLoader.js
 * 
 * Loads and parses the ANSUR II Male CSV dataset.
 * Computes population statistics and provides filtering/selection methods.
 * 
 * Educational features:
 *   - Real subject data with actual measurements
 *   - Population statistics (mean, SD, percentiles)
 *   - Filtering by measurement ranges
 *   - Percentile calculation for any value
 */

/**
 * Parse CSV string into array of objects
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n')
  const headers = lines[0].split(',')
  const rows = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const row = {}
    for (let j = 0; j < headers.length; j++) {
      const val = values[j]?.trim()
      // Try to parse as number, else keep as string
      row[headers[j]] = isNaN(val) ? val : parseFloat(val)
    }
    rows.push(row)
  }
  
  return rows
}

/**
 * Compute basic statistics for a numeric array
 */
function computeStats(values) {
  const sorted = values.filter(v => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  
  const n = sorted.length
  const mean = sorted.reduce((a, b) => a + b, 0) / n
  const variance = sorted.reduce((a, v) => a + (v - mean) ** 2, 0) / n
  const sd = Math.sqrt(variance)
  
  return {
    count: n,
    min: sorted[0],
    max: sorted[n - 1],
    mean,
    sd,
    median: sorted[Math.floor(n / 2)],
    sorted,
  }
}

/**
 * Calculate percentile of a value in dataset
 */
function valueToPercentile(value, sorted) {
  if (!sorted || sorted.length === 0) return 50
  const index = sorted.findIndex(v => v >= value)
  if (index === -1) return 100
  if (index === 0) return 0
  return Math.round((index / sorted.length) * 100)
}

/**
 * Key anthropometric measurements we care about
 */
const KEY_MEASUREMENTS = [
  { key: 'stature', label: 'Stature (Height)', unit: 'mm' },
  { key: 'buttockkneelength', label: 'Femur Length', unit: 'mm' },
  { key: 'kneeheightmidpatella', label: 'Tibia Length', unit: 'mm' },
  { key: 'acromionradialelength', label: 'Humerus Length', unit: 'mm' },
  { key: 'radialestylionlength', label: 'Forearm Length', unit: 'mm' },
  { key: 'handlength', label: 'Hand Length', unit: 'mm' },
  { key: 'footlength', label: 'Foot Length', unit: 'mm' },
  { key: 'sittingheight', label: 'Sitting Height', unit: 'mm' },
  { key: 'biacromialbreadth', label: 'Shoulder Breadth', unit: 'mm' },
  { key: 'hipbreadth', label: 'Hip Breadth', unit: 'mm' },
]

export class ANSURDataLoader {
  constructor() {
    this.subjects = []
    this.stats = new Map() // key → { mean, sd, sorted, etc }
    this.isLoaded = false
      this.ethnicities = new Map() // ethnicity → subjects array
  }

  /**
   * Load and parse the CSV file
   */
  async load(csvUrl = '/ANSUR_II_MALE_Public.csv') {
    try {
      const response = await fetch(csvUrl)
      const text = await response.text()
      this.subjects = parseCSV(text)
      
      // Compute statistics for each key measurement
      for (const { key } of KEY_MEASUREMENTS) {
        const values = this.subjects.map(s => s[key])
        const stats = computeStats(values)
        if (stats) this.stats.set(key, stats)
      }
      
      this.isLoaded = true
      return this.subjects.length
    } catch (err) {
      console.error('Failed to load ANSUR data:', err)
      this.isLoaded = false
      return 0
    }
  }

  /**
   * Get summary statistics for a measurement key
   */
  getStats(key) {
    return this.stats.get(key)
  }

  /**
   * Get all measurement statistics as array
   */
  getAllStats() {
    return KEY_MEASUREMENTS.map(({ key, label, unit }) => ({
      key,
      label,
      unit,
      stats: this.stats.get(key),
    })).filter(m => m.stats)
  }

  /**
   * Get a specific subject by index
   */
  getSubject(index) {
    return this.subjects[index]
  }

  /**
   * Get measurement value for a subject
   */
  getSubjectMeasurement(subjectIndex, key) {
    return this.subjects[subjectIndex]?.[key]
  }

  /**
   * Calculate percentile for any measurement value
   */
  getPercentile(key, value) {
    const stats = this.stats.get(key)
    if (!stats) return 50
    return valueToPercentile(value, stats.sorted)
  }

  /**
   * Filter subjects by measurement range
   */
  filterByMeasurement(key, minVal, maxVal) {
    return this.subjects.filter(s => {
      const val = s[key]
      return typeof val === 'number' && val >= minVal && val <= maxVal
    })
  }

  /**
   * Find subjects similar to a given profile
   */
  findSimilar(referenceSubject, tolerance = 0.1) {
    // tolerance: 0.1 = 10% variation on each measurement
    const similar = []
    
    for (const subject of this.subjects) {
      let matches = 0
      let totalMeasures = 0
      
      for (const { key } of KEY_MEASUREMENTS) {
        const refVal = referenceSubject[key]
        const subVal = subject[key]
        
        if (typeof refVal === 'number' && typeof subVal === 'number') {
          const diff = Math.abs(refVal - subVal) / refVal
          if (diff <= tolerance) matches++
          totalMeasures++
        }
      }
      
      if (totalMeasures > 0 && matches / totalMeasures >= 0.5) {
        similar.push(subject)
      }
    }
    
    return similar.sort((a, b) => {
      // Sort by distance to reference
      let distA = 0, distB = 0
      for (const { key } of KEY_MEASUREMENTS) {
        const ref = referenceSubject[key]
        if (typeof ref === 'number') {
          distA += ((a[key] - ref) / ref) ** 2
          distB += ((b[key] - ref) / ref) ** 2
        }
      }
      return distA - distB
    }).slice(0, 20) // Return top 20
  }

  /**
   * Get percentile of a subject's measurement
   */
  getSubjectPercentile(subjectIndex, key) {
    const value = this.subjects[subjectIndex]?.[key]
    if (typeof value !== 'number') return null
    return this.getPercentile(key, value)
  }

  /**
   * Get all measurements for a subject
   */
  getSubjectMeasurements(subjectIndex) {
    const subject = this.subjects[subjectIndex]
    if (!subject) return null
    
    return KEY_MEASUREMENTS.map(({ key, label, unit }) => ({
      key,
      label,
      unit,
      value: subject[key],
      percentile: this.getPercentile(key, subject[key]),
    }))
  }

  /**
   * Get random subject
   */
  getRandomSubject() {
    const idx = Math.floor(Math.random() * this.subjects.length)
    return { index: idx, subject: this.subjects[idx] }
  }

  /**
   * Get total number of subjects
   */
  getSubjectCount() {
    return this.subjects.length
  }
}

export { KEY_MEASUREMENTS, valueToPercentile }
