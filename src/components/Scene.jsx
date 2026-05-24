import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import SkeletonModel from './SkeletonModel.jsx'
import MuscleModel from './MuscleModel.jsx'
import JointModel from './JointModel.jsx'
import VascularModel from './VascularModel.jsx'
import { CAMERA_PRESETS } from './CameraControls.jsx'

// Animates the camera to a preset position
function CameraManager({ cameraPresetKey }) {
  const { camera } = useThree()

  useEffect(() => {
    if (!cameraPresetKey || !CAMERA_PRESETS[cameraPresetKey]) return

    const preset    = CAMERA_PRESETS[cameraPresetKey]
    const startPos  = { x: camera.position.x, y: camera.position.y, z: camera.position.z }
    const targetPos = preset.position
    const duration  = 600
    let startTime   = null

    const animate = currentTime => {
      if (startTime === null) startTime = currentTime
      const elapsed  = currentTime - startTime
      const t        = Math.min(elapsed / duration, 1)
      // Cubic ease-in-out
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

      camera.position.x = startPos.x + (targetPos[0] - startPos.x) * ease
      camera.position.y = startPos.y + (targetPos[1] - startPos.y) * ease
      camera.position.z = startPos.z + (targetPos[2] - startPos.z) * ease

      if (t < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [cameraPresetKey, camera])

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
  cameraPreset    = 'front',
  activeBoneGroup = 'All Bones',
  boneFadeMode    = 'fade',
  highlightBone   = null,
  showVascular    = false,
  activeVascularGroup = 'All Vessels',
  vascularFilterMode  = 'fade',
}) {
  return (
    <div id="canvas-container">
      <Canvas
        camera={{ position: [0, -0.2, 5], fov: 50, near: 0.01, far: 200 }}
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

        {showSkeleton && (
          <SkeletonModel
            selectedBone={selectedBone}
            onSelect={onSelect}
            heightPreset={heightPreset}
            statureScale={statureScale}
            shoulderScale={shoulderScale}
            hipScale={hipScale}
            activeBoneGroup={activeBoneGroup}
            boneFadeMode={boneFadeMode}
            highlightBone={highlightBone}
          />
        )}

        <MuscleModel
          visible={showMuscles}
          selectedBone={selectedBone}
          onSelect={onSelect}
          activeGroup={activeGroup}
          filterMode={filterMode}
          heightPreset={heightPreset}
          statureScale={statureScale}
          shoulderScale={shoulderScale}
          hipScale={hipScale}
        />

        <JointModel
          visible={showJoints}
          selectedBone={selectedBone}
          onSelect={onSelect}
          activeGroup={activeJointGroup}
          filterMode={jointFilterMode}
          heightPreset={heightPreset}
          statureScale={statureScale}
          shoulderScale={shoulderScale}
          hipScale={hipScale}
        />

        <VascularModel
          visible={showVascular}
          selectedBone={selectedBone}
          onSelect={onSelect}
          activeGroup={activeVascularGroup}
          filterMode={vascularFilterMode}
          heightPreset={heightPreset}
          statureScale={statureScale}
          shoulderScale={shoulderScale}
          hipScale={hipScale}
        />

        <OrbitControls
          enableDamping
          dampingFactor={0.06}
          minDistance={0.5}
          maxDistance={12}
          target={[0, -0.2, 0]}
        />

        <CameraManager cameraPresetKey={cameraPreset} />
      </Canvas>
    </div>
  )
}
