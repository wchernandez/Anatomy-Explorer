import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import SkeletonModel from './SkeletonModel.jsx'
import MuscleModel from './MuscleModel.jsx'

export default function Scene({ selectedBone, onSelect, showSkeleton, showMuscles, activeGroup, filterMode, heightPreset, statureScale = 1, shoulderScale = 1, hipScale = 1 }) {
  return (
    <div id="canvas-container">
      <Canvas
        camera={{ position: [0, 1.6, 4], fov: 50, near: 0.01, far: 200 }}
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

        <OrbitControls
          enableDamping
          dampingFactor={0.06}
          minDistance={0.5}
          maxDistance={12}
        />
      </Canvas>
    </div>
  )
}