import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useEffect, useRef, useState } from 'react'
import SkeletonModel from './SkeletonModel.jsx'
import MuscleModel from './MuscleModel.jsx'
import JointModel from './JointModel.jsx'
import VascularModel from './VascularModel.jsx'
import { CAMERA_PRESETS } from './CameraControls.jsx'

// Animates the camera to a preset position via spherical interpolation
// so it always arcs around the model rather than cutting through it.
function CameraManager({ cameraPresetKey, resetCounter, controlsRef }) {
  const { camera } = useThree()
  const rafRef = useRef(null)

  // Shared animation helper
  const animateToPreset = (presetKey) => {
    if (!CAMERA_PRESETS[presetKey]) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const preset = CAMERA_PRESETS[presetKey]
    const target = new THREE.Vector3(...preset.target)
    const startVec = camera.position.clone().sub(target)
    const endVec   = new THREE.Vector3(...preset.position).sub(target)
    const startSph = new THREE.Spherical().setFromVector3(startVec)
    const endSph   = new THREE.Spherical().setFromVector3(endVec)
    let dTheta = endSph.theta - startSph.theta
    if (dTheta >  Math.PI) dTheta -= 2 * Math.PI
    if (dTheta < -Math.PI) dTheta += 2 * Math.PI
    const duration = 900
    let startTime  = null
    const animate = currentTime => {
      if (startTime === null) startTime = currentTime
      const elapsed = currentTime - startTime
      const t    = Math.min(elapsed / duration, 1)
      const ease = -(Math.cos(Math.PI * t) - 1) / 2
      const sph  = new THREE.Spherical(
        startSph.radius + (endSph.radius - startSph.radius) * ease,
        startSph.phi    + (endSph.phi    - startSph.phi)    * ease,
        startSph.theta  + dTheta                            * ease,
      )
      camera.position.setFromSpherical(sph).add(target)
      camera.lookAt(target)
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    if (!cameraPresetKey) return
    animateToPreset(cameraPresetKey)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [cameraPresetKey, camera])

  useEffect(() => {
    if (!resetCounter) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const preset   = CAMERA_PRESETS['front']
    const endTarget = new THREE.Vector3(...preset.target)
    const endPos    = new THREE.Vector3(...preset.position)

    const startPos    = camera.position.clone()
    const startTarget = controlsRef?.current
      ? controlsRef.current.target.clone()
      : endTarget.clone()

    const duration = 1400
    let startTime  = null

    const animate = currentTime => {
      if (startTime === null) startTime = currentTime
      const elapsed = currentTime - startTime
      const t    = Math.min(elapsed / duration, 1)
      const ease = -(Math.cos(Math.PI * t) - 1) / 2

      camera.position.lerpVectors(startPos, endPos, ease)

      if (controlsRef?.current) {
        controlsRef.current.target.lerpVectors(startTarget, endTarget, ease)
        controlsRef.current.update()
      }

      camera.lookAt(controlsRef?.current ? controlsRef.current.target : endTarget)

      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [resetCounter, camera])

  return null
}

export default function Scene({
  selectedBone,
  onSelect,
  showSkeleton,
  showMuscles,
  showJoints,
  activeGroup,
  filterMode,
  activeJointGroup,
  jointFilterMode,
  heightPreset,
  statureScale    = 1,
  shoulderScale   = 1,
  hipScale        = 1,
  bodyShoulderScale = 1,
  bodyHipScale      = 1,
  cameraPreset    = 'front',
  activeBoneGroup = 'All Bones',
  boneFadeMode    = 'fade',
  highlightBone   = null,
  showVascular    = false,
  activeVascularGroup = 'All Vessels',
  vascularFilterMode  = 'fade',
  skeletonFaded   = false,
  musclesFaded    = false,
  jointsFaded     = false,
  vascularFaded   = false,
  onInteract,
  resetCounter    = 0,
}) {
  // The skeleton is the reference layer: it reports ONE transform (scale +
  // position) that drives a single shared body group wrapping every layer, so
  // all layers are guaranteed to stay perfectly aligned at any scale.
  const [bodyTransform, setBodyTransform] = useState(null)
  const controlsRef = useRef(null)
  const dragStart = useRef(null)
  const didDrag = useRef(false)

  const handleTransformReady = useRef(t => setBodyTransform(t)).current

  const handlePointerDown = (e) => {
    dragStart.current = { x: e.clientX, y: e.clientY }
    didDrag.current = false
  }

  const handlePointerMove = (e) => {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (Math.sqrt(dx * dx + dy * dy) > 4) {
      if (!didDrag.current) {
        didDrag.current = true
        onInteract && onInteract()
      }
    }
  }

  const handlePointerUp = () => {
    dragStart.current = null
  }

  return (
    <div
      id="canvas-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <Canvas
        camera={{ position: [0, -0.2, 5], fov: 50, near: 0.01, far: 200 }}
        onPointerMissed={() => onSelect && onSelect(null)}
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        <color attach="background" args={['#0a0a0b']} />
        <fogExp2 attach="fog" color="#0a0a0b" density={0.04} />

        <ambientLight color="#f5e8d8" intensity={0.65} />
        <directionalLight
          color="#fff8f0"
          intensity={1.4}
          position={[3, 6, 4]}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.1}
          shadow-camera-far={30}
        />
        <directionalLight color="#f0d8c0" intensity={0.9} position={[-4, 2, -2]} />
        <directionalLight color="#ffe0c0" intensity={0.4} position={[0, -3, -5]} />
        <pointLight color="#ffddbb" intensity={0.6} distance={12} position={[2, 3, 2]} />

        {/* Single shared body group — ONE transform drives every layer, so all
            layers stay perfectly aligned. Hidden until the skeleton reports its
            transform to avoid a one-frame flash at the wrong scale. */}
        <group
          scale={bodyTransform ? bodyTransform.scale : [1, 1, 1]}
          position={bodyTransform ? bodyTransform.position : [0, 0, 0]}
          visible={bodyTransform !== null}
        >
          {/* SkeletonModel is ALWAYS mounted so it can report the shared transform
              even when the skeleton layer is toggled off. */}
          {/* Skeleton drives the shared body group. Feed it the weight-FREE
              X/Z scales so neither it nor the group respond to the weight slider. */}
          <SkeletonModel
            visible={showSkeleton}
            selectedBone={selectedBone}
            onSelect={onSelect}
            heightPreset={heightPreset}
            statureScale={statureScale}
            shoulderScale={bodyShoulderScale}
            hipScale={bodyHipScale}
            activeBoneGroup={activeBoneGroup}
            boneFadeMode={boneFadeMode}
            highlightBone={highlightBone}
            onTransformReady={handleTransformReady}
            layerFaded={skeletonFaded}
          />

          {/* Muscle tracks the skeleton via the weight-free body* scales; the
              gap between those and the FULL scales is the weight-only gain,
              applied as in-place thickening to the orange muscle tissue only. */}
          <MuscleModel
            visible={showMuscles}
            selectedBone={selectedBone}
            onSelect={onSelect}
            activeGroup={activeGroup}
            filterMode={filterMode}
            shoulderScale={shoulderScale}
            hipScale={hipScale}
            bodyShoulderScale={bodyShoulderScale}
            bodyHipScale={bodyHipScale}
            layerFaded={musclesFaded}
          />

          <JointModel
            visible={showJoints}
            selectedBone={selectedBone}
            onSelect={onSelect}
            activeGroup={activeJointGroup}
            filterMode={jointFilterMode}
            shoulderScale={bodyShoulderScale}
            hipScale={bodyHipScale}
            layerFaded={jointsFaded}
          />

          <VascularModel
            visible={showVascular}
            selectedBone={selectedBone}
            onSelect={onSelect}
            activeGroup={activeVascularGroup}
            filterMode={vascularFilterMode}
            shoulderScale={bodyShoulderScale}
            hipScale={bodyHipScale}
            layerFaded={vascularFaded}
          />
        </group>

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          minDistance={0.5}
          maxDistance={12}
          target={[0, -0.2, 0]}
        />

        <CameraManager cameraPresetKey={cameraPreset} resetCounter={resetCounter} controlsRef={controlsRef} />
      </Canvas>
    </div>
  )
}
