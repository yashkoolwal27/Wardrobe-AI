import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, useTexture, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OutfitItem } from '../types';
import { Loader2 } from 'lucide-react';

interface OutfitStageProps {
  selectedItems: OutfitItem[];
  isGenerating?: boolean;
}

// Map categories to vertical mannequin positions
const SLOT_Y_POSITIONS: Record<string, number> = {
  accessory: 1.8,  // Head height
  outerwear: 0.7,  // Chest height (layered)
  top:       0.6,  // Chest height
  bag:      -0.2,  // Hand/waist height
  bottom:   -0.6,  // Hip/legs height
  footwear: -1.7,  // Feet height
};

function SnappedItem({ item }: { item: OutfitItem }) {
  const meshRef = useRef<THREE.Group>(null);
  const targetY = SLOT_Y_POSITIONS[item.category] ?? 0;
  
  // Outerwear is rendered slightly forward on the Z axis to layer over tops
  const targetZ = item.category === 'outerwear' ? 0.15 : 0.05;

  // Let texture load
  let texture: THREE.Texture | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    texture = useTexture(item.imageUrl);
  } catch (err) {
    console.error('Failed to load item image texture:', err);
  }

  // Snap spring/lerp animation
  useEffect(() => {
    if (meshRef.current) {
      // Start higher (spring drop) when item first enters/mounts
      meshRef.current.position.set(0, targetY + 1.5, 0.5);
      meshRef.current.scale.set(0.1, 0.1, 0.1);
    }
  }, [item.imageUrl, targetY]);

  useFrame(() => {
    if (!meshRef.current) return;
    
    // Lerp position to snap point
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.15);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.15);
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, 0, 0.15);

    // Lerp scale to full
    const currentScale = meshRef.current.scale.x;
    const targetScale = THREE.MathUtils.lerp(currentScale, 1.0, 0.15);
    meshRef.current.scale.set(targetScale, targetScale, targetScale);
  });

  return (
    <group ref={meshRef}>
      {texture ? (
        <mesh castShadow receiveShadow>
          <planeGeometry args={[1.2, 1.4]} />
          <meshBasicMaterial map={texture} transparent alphaTest={0.05} side={THREE.DoubleSide} />
        </mesh>
      ) : (
        <mesh>
          <planeGeometry args={[1.2, 1.4]} />
          <meshStandardMaterial color="#333" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

// Abstract wireframe/glass mannequin
function StylizedMannequin() {
  const mannequinGroup = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!mannequinGroup.current) return;
    // Ambient drift
    mannequinGroup.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.8) * 0.05;
  });

  return (
    <group ref={mannequinGroup} position={[0, 0, -0.1]}>
      {/* Head */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color="#c9a84c" wireframe transparent opacity={0.15} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.08, 0.09, 0.2, 16]} />
        <meshStandardMaterial color="#c9a84c" wireframe transparent opacity={0.15} />
      </mesh>

      {/* Torso / Upper Body */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.3, 0.22, 1.1, 16]} />
        <meshStandardMaterial color="#c9a84c" wireframe transparent opacity={0.1} />
      </mesh>

      {/* Hips / Lower Body */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 0.7, 16]} />
        <meshStandardMaterial color="#c9a84c" wireframe transparent opacity={0.1} />
      </mesh>

      {/* Left Leg */}
      <mesh position={[-0.15, -1.1, 0]}>
        <cylinderGeometry args={[0.1, 0.07, 0.9, 16]} />
        <meshStandardMaterial color="#c9a84c" wireframe transparent opacity={0.1} />
      </mesh>

      {/* Right Leg */}
      <mesh position={[0.15, -1.1, 0]}>
        <cylinderGeometry args={[0.1, 0.07, 0.9, 16]} />
        <meshStandardMaterial color="#c9a84c" wireframe transparent opacity={0.1} />
      </mesh>

      {/* Floor reflection disk */}
      <mesh position={[0, -2.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 1.5, 32]} />
        <meshBasicMaterial color="#c9a84c" transparent opacity={0.03} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function OutfitStageScene({ selectedItems, isGenerating = false }: OutfitStageProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-charcoal-950 via-charcoal-900 to-charcoal-950">
      {/* AI Generating visual overlay */}
      {isGenerating && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-charcoal-950/80 backdrop-blur-sm gap-4 transition-opacity duration-300">
          <div className="relative w-16 h-16">
            {/* 3D-like spinning border ring */}
            <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-gold-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border-4 border-white/5 border-b-gold-300 animate-spin-slow" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-display text-lg font-medium text-gradient-gold animate-pulse tracking-wide">
              Compositing Outfit
            </span>
            <span className="text-xs text-charcoal-400">Gemini is styling your look...</span>
          </div>
        </div>
      )}

      {/* R3F Canvas */}
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center gap-3">
            <Loader2 className="animate-spin text-gold-500" size={24} />
            <span className="text-sm text-charcoal-400 font-medium">Preparing Stage...</span>
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0, 4.5], fov: isMobile ? 65 : 55 }}
          shadows
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.0} />
          <spotLight position={[0, 8, 2]} intensity={1.5} angle={0.5} penumbra={0.5} />

          {/* Particle drift / Shimmer effect */}
          <Sparkles
            count={isGenerating ? (isMobile ? 120 : 250) : (isMobile ? 30 : 60)}
            scale={6}
            size={isMobile ? 1.5 : 2}
            speed={isGenerating ? 2.5 : 0.4}
            color={isGenerating ? '#f5de98' : '#c9a84c'}
          />

          <StylizedMannequin />

          {/* Render selected items snapped to targets */}
          {selectedItems.map((item) => (
            <SnappedItem key={item.wardrobeItemId} item={item} />
          ))}

          <OrbitControls
            enableZoom={true}
            maxDistance={8}
            minDistance={3}
            maxPolarAngle={Math.PI / 1.7}
            minPolarAngle={Math.PI / 2.3}
            enablePan={false}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
export default OutfitStageScene;
