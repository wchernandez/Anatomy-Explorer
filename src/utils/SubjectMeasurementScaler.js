/**
 * SubjectMeasurementScaler.js
 * 
 * Scales the 3D model to match a specific subject's measurements from the ANSUR dataset.
 * Educational: Shows how real measurements translate to 3D proportions.
 */

import * as THREE from 'three'

export class SubjectMeasurementScaler {
  /**
   * @param {THREE.Object3D} skeletonScene
   * @param {THREE.Object3D} muscleScene
   * @param {Object} baselineStats - { stature: { mean, sd }, ... } ANSUR baseline
   */
  constructor(skeletonScene, muscleScene, baselineStats = {}) {
    this.skeletonScene = skeletonScene
    this.muscleScene = muscleScene
    this.baselineStats = baselineStats
    
    // Collect all meshes
    const allMeshes = []
    skeletonScene.traverse(c => { if (c.isMesh) allMeshes.push(c) })
    muscleScene.traverse(c => { if (c.isMesh) allMeshes.push(c) })
    
    // Store original transforms
    this._original = new Map()
    for (const mesh of allMeshes) {
      this._original.set(mesh.uuid, {
        position: mesh.position.clone(),
        scale: mesh.scale.clone(),
        geometry: mesh.geometry,
      })
    }
    
    // Compute model's bounding box
    const box = new THREE.Box3()
    for (const mesh of allMeshes) {
      mesh.geometry.computeBoundingBox()
      box.expandByObject(mesh)
    }
    this.modelHeight = box.max.y - box.min.y
    this.modelBreadth = box.max.x - box.min.x
    
    // Current measurement being applied
    this.currentMeasurements = null
    this.scaleFactor = 1.0
  }

  /**
   * Apply subject measurements to the model
   * @param {Object} measurements - { stature: 1756.21, footlength: 271.18, ... }
   */
  applyMeasurements(measurements) {
    this.currentMeasurements = measurements
    
    // Primary scale: by stature (height)
    const baselineStature = this.baselineStats.stature?.mean || 1756.21
    const statuScale = (measurements.stature || baselineStature) / baselineStature
    
    // Secondary scale: breadth
    const baselineBreadth = this.baselineStats.biacromialbreadth?.mean || 415.68
    const breadthScale = (measurements.biacromialbreadth || baselineBreadth) / baselineBreadth
    
    this.scaleFactor = statuScale
    
    // Reset all meshes
    this.skeletonScene.traverse(c => {
      if (c.isMesh && this._original.has(c.uuid)) {
        const orig = this._original.get(c.uuid)
        c.position.copy(orig.position)
        c.scale.copy(orig.scale)
      }
    })
    this.muscleScene.traverse(c => {
      if (c.isMesh && this._original.has(c.uuid)) {
        const orig = this._original.get(c.uuid)
        c.position.copy(orig.position)
        c.scale.copy(orig.scale)
      }
    })
    
    // Apply scaling
    const applyToMesh = (mesh) => {
      if (!this._original.has(mesh.uuid)) return
      const orig = this._original.get(mesh.uuid)
      
      // Scale by stature in Y, breadth in X/Z
      mesh.scale.y *= statuScale
      mesh.scale.x *= breadthScale
      mesh.scale.z *= breadthScale
      
      // Translate accordingly (keep feet at same position)
      mesh.position.y *= statuScale
      mesh.position.x *= breadthScale
      mesh.position.z *= breadthScale
    }
    
    this.skeletonScene.traverse(c => { if (c.isMesh) applyToMesh(c) })
    this.muscleScene.traverse(c => { if (c.isMesh) applyToMesh(c) })
  }

  /**
   * Reset to baseline
   */
  reset() {
    this.skeletonScene.traverse(c => {
      if (c.isMesh && this._original.has(c.uuid)) {
        const orig = this._original.get(c.uuid)
        c.position.copy(orig.position)
        c.scale.copy(orig.scale)
      }
    })
    this.muscleScene.traverse(c => {
      if (c.isMesh && this._original.has(c.uuid)) {
        const orig = this._original.get(c.uuid)
        c.position.copy(orig.position)
        c.scale.copy(orig.scale)
      }
    })
    this.currentMeasurements = null
    this.scaleFactor = 1.0
  }

  /**
   * Get current scale factors
   */
  getScaleFactors() {
    return { overall: this.scaleFactor }
  }
}
