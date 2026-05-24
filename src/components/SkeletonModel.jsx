import { useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF, useCursor } from '@react-three/drei'
import * as THREE from 'three'

const defaultMat = new THREE.MeshStandardMaterial({ color: 0xc8b89a, roughness: 0.65, metalness: 0.05 })
const hoverMat   = new THREE.MeshStandardMaterial({ color: 0xe8d8b8, roughness: 0.5,  metalness: 0.1,  emissive: new THREE.Color(0x3a2a10), emissiveIntensity: 0.4 })
const selectedMat = new THREE.MeshStandardMaterial({ color: 0xff8060, roughness: 0.4,  metalness: 0.1,  emissive: new THREE.Color(0x8a2010), emissiveIntensity: 0.6 })
const highlightMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.4,  metalness: 0.1,  emissive: new THREE.Color(0x664400), emissiveIntensity: 0.8 })
const correctMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, roughness: 0.4, metalness: 0.1, emissive: new THREE.Color(0x004422), emissiveIntensity: 0.8 })

export default function SkeletonModel({ selectedBone, onSelect, highlightBone, correctBone, clickable = true }) {
  const { scene } = useGLTF('/Skeleton.glb')
  const [hovered, setHovered] = useState(null)
  const groupRef = useRef()

  useCursor(!!hovered)

  const meshes = useMemo(() => {
    const list = []
    scene.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        list.push(child)
      }
    })
    return list
  }, [scene])

  useEffect(() => {
    if (!groupRef.current) return
    const box = new THREE.Box3().setFromObject(groupRef.current)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const scale = 3 / Math.max(size.x, size.y, size.z)
    groupRef.current.scale.setScalar(scale)
    groupRef.current.position.sub(center.multiplyScalar(scale))
  }, [scene])

  meshes.forEach(mesh => {
    const meshName = (mesh.name || mesh.parent?.name || '').toLowerCase()
    if (highlightBone && meshName.includes(highlightBone))
      mesh.material = highlightMat
    else if (correctBone && meshName.includes(correctBone))  
      mesh.material = correctMat
    else if (mesh === selectedBone)                        
      mesh.material = selectedMat
    else if (mesh === hovered)                             
      mesh.material = hoverMat
    else                                                   
      mesh.material = defaultMat
  })

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        onClick={(e) => {
          e.stopPropagation()
          if (clickable) onSelect(e.object)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          if (clickable) setHovered(e.object)
        }}
        onPointerOut={() => setHovered(null)}
      />
    </group>
  )
}

useGLTF.preload('/Skeleton.glb')
