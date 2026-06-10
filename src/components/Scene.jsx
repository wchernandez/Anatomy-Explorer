import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useEffect, useRef, useState } from 'react'
import SkeletonModel, { BONE_GROUPS } from './SkeletonModel.jsx'
import MuscleModel from './MuscleModel.jsx'
import JointModel from './JointModel.jsx'
import VascularModel from './VascularModel.jsx'
import { CAMERA_PRESETS } from './CameraControls.jsx'

// Measures the world-space framing for a body region (a BONE_GROUP): returns
// { center, dist } so the camera can orbit that region instead of the whole body.
function frameRegion(skelScene, focusGroup, camera) {
  if (!skelScene) return null
  const keywords = BONE_GROUPS[focusGroup] // null/All Bones = whole skeleton
  const box = new THREE.Box3()
  skelScene.updateWorldMatrix(true, true)
  skelScene.traverse(c => {
    if (!c.isMesh) return
    if (keywords && !keywords.some(k => (c.name || '').toLowerCase().includes(k.toLowerCase()))) return
    box.expandByObject(c)
  })
  if (box.isEmpty()) return null
  const center = box.getCenter(new THREE.Vector3())
  const size   = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  const fov    = (camera.fov * Math.PI) / 180
  const dist   = (maxDim / 2) / Math.tan(fov / 2) * 1.7 + 0.25
  return { center, dist }
}

// Animates the camera to a preset position via spherical interpolation
// so it always arcs around the model rather than cutting through it.
function CameraManager({ cameraPresetKey, cameraPresetNonce, resetCounter, controlsRef, focusGroup, skelScene, regionFocused }) {
  const { camera } = useThree()
  const rafRef = useRef(null)

  // Shared animation helper. When a region is isolated/quizzed, the preset angle
  // is applied RELATIVE to that region (its bbox centre + a fitted distance)
  // instead of the whole body.
  const animateToPreset = (presetKey) => {
    if (!CAMERA_PRESETS[presetKey]) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const preset  = CAMERA_PRESETS[presetKey]
    const framing = regionFocused ? frameRegion(skelScene, focusGroup, camera) : null

    // Target = region centre (when focused) or the preset's world target.
    const target  = framing ? framing.center.clone() : new THREE.Vector3(...preset.target)
    // Direction the camera looks FROM (same for the whole body), scaled to the
    // region's fitted distance when focused.
    const endVec  = framing
      ? new THREE.Vector3(...preset.position).sub(new THREE.Vector3(...preset.target)).normalize().multiplyScalar(framing.dist)
      : new THREE.Vector3(...preset.position).sub(target)

    const startVec    = camera.position.clone().sub(target)
    const startTarget = controlsRef?.current ? controlsRef.current.target.clone() : target.clone()
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
      // Fly the orbit target to the region centre too, so it stays framed.
      const curTarget = startTarget.clone().lerp(target, ease)
      camera.position.setFromSpherical(sph).add(curTarget)
      if (controlsRef?.current) { controlsRef.current.target.copy(curTarget); controlsRef.current.update() }
      camera.lookAt(curTarget)
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    if (!cameraPresetKey) return
    animateToPreset(cameraPresetKey)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    // cameraPresetNonce re-fires this even when the same preset is re-picked.
  }, [cameraPresetKey, cameraPresetNonce, camera])

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

// Frames the camera on a body region (a BONE_GROUP) by measuring the world-space
// bounding box of the meshes that belong to it, then smoothly flying the camera
// and orbit target so only that region fills the view. Triggered whenever
// focusToken changes (i.e. when a quiz starts).
function FocusManager({ focusToken, focusGroup, controlsRef, skelScene }) {
  const { camera } = useThree()
  const rafRef = useRef(null)

  useEffect(() => {
    if (!focusToken || !skelScene) return

    const keywords = BONE_GROUPS[focusGroup] // null = whole skeleton
    const box = new THREE.Box3()
    skelScene.updateWorldMatrix(true, true)
    skelScene.traverse(c => {
      if (!c.isMesh) return
      if (keywords && !keywords.some(k => (c.name || '').toLowerCase().includes(k.toLowerCase()))) return
      box.expandByObject(c)
    })
    if (box.isEmpty()) return

    const center = box.getCenter(new THREE.Vector3())
    const size   = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov    = (camera.fov * Math.PI) / 180
    const dist   = (maxDim / 2) / Math.tan(fov / 2) * 1.7 + 0.25

    // Frame from the front with a slight downward tilt onto the region centre.
    const dir    = new THREE.Vector3(0, 0.12, 1).normalize()
    const endPos    = center.clone().add(dir.multiplyScalar(dist))
    const endTarget = center.clone()

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const startPos    = camera.position.clone()
    const startTarget = controlsRef?.current ? controlsRef.current.target.clone() : endTarget.clone()
    const duration = 1100
    let startTime = null
    const animate = currentTime => {
      if (startTime === null) startTime = currentTime
      const t    = Math.min((currentTime - startTime) / duration, 1)
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
  }, [focusToken])

  return null
}

// Slowly turntables the skeleton around the vertical (Y) axis while idle — this
// keeps it standing straight up. Any interaction (orbit/zoom/pan, picking a
// camera angle, focusing a region) stops the spin and it stays stopped. Hitting
// Reset View is what resumes the spin (CameraManager flies back to default in
// parallel). Spinning is driven by toggling OrbitControls' autoRotate via the
// `spinning` state.
function IdleSpinner({ controlsRef, allowSpin, setSpinning, cameraPreset, cameraPresetNonce, focusToken, resetCounter }) {
  // Stop spinning the instant the user grabs the model. 'start' fires on a
  // user pointer/wheel grab — never for autoRotate itself.
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    const onStart = () => setSpinning(false)
    controls.addEventListener('start', onStart)
    return () => controls.removeEventListener('start', onStart)
  }, [controlsRef.current])

  // Picking a camera angle or focusing a region also stops the spin. Skip the
  // initial mount so the load spin isn't cancelled.
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return }
    setSpinning(false)
    // cameraPresetNonce re-fires this even when the same preset is re-picked, so
    // pressing Front while the model is auto-spinning still stops the spin.
  }, [cameraPreset, cameraPresetNonce, focusToken])

  // Reset View resumes the idle spin (skip the initial mount).
  const firstReset = useRef(true)
  useEffect(() => {
    if (firstReset.current) { firstReset.current = false; return }
    setSpinning(true)
  }, [resetCounter])

  // Never spin during quiz/isolation.
  useEffect(() => {
    if (!allowSpin) setSpinning(false)
  }, [allowSpin])

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
  cameraPresetNonce = 0,
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
  resetCounter    = 0,
  focusToken      = 0,
  focusGroup      = 'All Bones',
  regionFocused   = false,
  quizMode        = false,
  quizGreenTarget = null,
  quizRedMesh     = null,
  quizRedTarget   = null,
  quizVisibleTargets = null,
}) {
  // The skeleton is the reference layer: it reports ONE transform (scale +
  // position) that drives a single shared body group wrapping every layer, so
  // all layers are guaranteed to stay perfectly aligned at any scale.
  const [bodyTransform, setBodyTransform] = useState(null)
  const [skelScene, setSkelScene] = useState(null)
  // Idle turntable spin: on by default, paused while the user interacts.
  const [spinning, setSpinning] = useState(true)
  const allowSpin = !quizMode && !regionFocused
  const controlsRef = useRef(null)

  const handleTransformReady = useRef(t => setBodyTransform(t)).current

  return (
    <div id="canvas-container">
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
            onSceneReady={setSkelScene}
            layerFaded={skeletonFaded}
            quizMode={quizMode}
            quizGreenTarget={quizGreenTarget}
            quizRedMesh={quizRedMesh}
            quizRedTarget={quizRedTarget}
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
            highlightBone={highlightBone}
            quizMode={quizMode}
            quizGreenTarget={quizGreenTarget}
            quizRedMesh={quizRedMesh}
            quizRedTarget={quizRedTarget}
            quizVisibleTargets={quizVisibleTargets}
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
            highlightBone={highlightBone}
            quizMode={quizMode}
            quizGreenTarget={quizGreenTarget}
            quizRedMesh={quizRedMesh}
            quizRedTarget={quizRedTarget}
            quizVisibleTargets={quizVisibleTargets}
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
            highlightBone={highlightBone}
            quizMode={quizMode}
            quizGreenTarget={quizGreenTarget}
            quizRedMesh={quizRedMesh}
            quizRedTarget={quizRedTarget}
            quizVisibleTargets={quizVisibleTargets}
          />
        </group>

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          minDistance={0.5}
          maxDistance={12}
          target={[0, -0.2, 0]}
          autoRotate={spinning && allowSpin}
          autoRotateSpeed={-1.2}
        />

        <CameraManager cameraPresetKey={cameraPreset} cameraPresetNonce={cameraPresetNonce} resetCounter={resetCounter} controlsRef={controlsRef} focusGroup={focusGroup} skelScene={skelScene} regionFocused={regionFocused} />
        <FocusManager focusToken={focusToken} focusGroup={focusGroup} controlsRef={controlsRef} skelScene={skelScene} />
        <IdleSpinner controlsRef={controlsRef} allowSpin={allowSpin} setSpinning={setSpinning} cameraPreset={cameraPreset} cameraPresetNonce={cameraPresetNonce} focusToken={focusToken} resetCounter={resetCounter} />
      </Canvas>
    </div>
  )
}
