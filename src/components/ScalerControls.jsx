/**
 * ScalerControls.jsx
 *
 * A self-contained React component that:
 *   1. Waits for both GLB scenes to be loaded (passed as props)
 *   2. Constructs a ProportionalScaler instance
 *   3. Mounts a lil-gui panel with "Taller" and "Wider" sliders
 *   4. Cleans up on unmount
 *
 * Props:
 *   skeletonScene  {THREE.Object3D}  – scene from useGLTF('/Skeleton.glb')
 *   muscleScene    {THREE.Object3D}  – scene from useGLTF('/Muscles.glb')
 *   onScalerReady  {(scaler) => void} – optional callback with the scaler instance
 *
 * Example:
 *   <ScalerControls
 *     skeletonScene={skeletonScene}
 *     muscleScene={muscleScene}
 *   />
 */

import { useEffect, useRef } from 'react'
import { GUI } from 'lil-gui'
import { ProportionalScaler } from '../utils/ProportionalScaler'

export default function ScalerControls({ skeletonScene, muscleScene, onScalerReady }) {
  const scalerRef = useRef(null)
  const guiRef    = useRef(null)

  useEffect(() => {
    // Both scenes must be available before we can snapshot vertices
    if (!skeletonScene || !muscleScene) return

    // ── Build scaler ─────────────────────────────────────────────────────────
    const scaler = new ProportionalScaler(skeletonScene, muscleScene)
    scalerRef.current = scaler
    onScalerReady?.(scaler)

    // ── Build GUI ────────────────────────────────────────────────────────────
    const gui = new GUI({ title: 'Body Proportions' })
    guiRef.current = gui

    // Style the panel so it floats top-right and above the canvas
    gui.domElement.style.position  = 'fixed'
    gui.domElement.style.top       = '80px'
    gui.domElement.style.right     = '16px'
    gui.domElement.style.zIndex    = '1000'

    // ── Sliders ───────────────────────────────────────────────────────────────
    gui.add(scaler.params, 'height', 0.5, 2.0, 0.01)
      .name('Taller')
      .onChange(() => scaler.apply())

    gui.add(scaler.params, 'width', 0.5, 2.0, 0.01)
      .name('Wider')
      .onChange(() => scaler.apply())

    // ── Dataset info (read-only) ─────────────────────────────────────────────
    const info = scaler.getDatasetInfo()
    const infoFolder = gui.addFolder('ANSUR II Baseline').close()
    const displayObj = {
      'Mean Height (mm)'      : info.meanStatureMm.toFixed(2),
      'Mean Breadth (mm)'     : info.meanBreadthMm.toFixed(2),
      'Correlation Ratio'     : info.correlationRatio.toFixed(5),
    }
    infoFolder.add(displayObj, 'Mean Height (mm)').disable()
    infoFolder.add(displayObj, 'Mean Breadth (mm)').disable()
    infoFolder.add(displayObj, 'Correlation Ratio').disable()

    // ── Reset button ──────────────────────────────────────────────────────────
    gui.add({ Reset: () => { scaler.reset(); gui.controllersRecursive().forEach(c => c.updateDisplay()) } }, 'Reset')

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    return () => {
      gui.destroy()
      guiRef.current  = null
      scalerRef.current = null
    }
  }, [skeletonScene, muscleScene, onScalerReady])

  // No DOM output from React — the GUI renders itself into document.body
  return null
}
