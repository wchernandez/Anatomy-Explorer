import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import SkeletonModel from './SkeletonModel.jsx'

export default function Scene({ selectedBone, onSelect }) {
  return (
    <div id="canvas-container">
      <Canvas
        camera={{ position: [0, 1.8, 4], fov: 50, near: 0.01, far: 200 }}
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
      >
        <color attach="background" args={['#0a0a0b']} />
        <fogExp2 attach="fog" color="#0a0a0b" density={0.04} />

        <ambientLight color="#d4c5a9" intensity={0.4} />
        <directionalLight
          color="#fff5e0"
          intensity={2.5}
          position={[3, 6, 4]}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.1}
          shadow-camera-far={30}
        />
        <directionalLight color="#c8d4e8" intensity={0.6} position={[-4, 2, -2]} />
        <directionalLight color="#c8a96e" intensity={0.8} position={[0, -3, -5]} />
        <pointLight color="#c8a96e" intensity={0.5} distance={10} position={[2, 3, 2]} />

        <SkeletonModel selectedBone={selectedBone} onSelect={onSelect} />

        <OrbitControls
          enableDamping
          dampingFactor={0.06}
          minDistance={0.5}
          maxDistance={12}
          target={[0, 0.55, 0]}
        />
      </Canvas>
    </div>
  )
}
