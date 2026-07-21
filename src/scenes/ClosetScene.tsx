import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sparkles, useTexture, Center } from '@react-three/drei';
import * as THREE from 'three';
import type { WardrobeItem } from '../types';
import { Loader2 } from 'lucide-react';

interface ClosetSceneProps {
  items: WardrobeItem[];
  onSelectItem?: (item: WardrobeItem) => void;
}

// ─── Clothing Card component inside Canvas ───────────────────
function ClosetCard({
  item,
  index,
  total,
  onSelect,
}: {
  item: WardrobeItem;
  index: number;
  total: number;
  onSelect: () => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [textureError, setTextureError] = useState(false);

  // Position cards in a circle around the center
  const radius = Math.max(3.5, total * 0.4); // Scale radius with item count
  const angle = (index / total) * Math.PI * 2;
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;
  const y = Math.sin(index * 2) * 0.2; // slight height offset for organic feel

  // Load clothing image texture
  let texture: THREE.Texture | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    texture = useTexture(item.imageUrl);
  } catch (err) {
    if (!textureError) setTextureError(true);
  }

  // Handle ambient floating movement
  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    // Subtle float
    meshRef.current.position.y = y + Math.sin(time + index) * 0.08;
    // Slowly look at center
    meshRef.current.rotation.y = angle + Math.PI;

    // Smooth scaling on hover
    const targetScale = hovered ? 1.25 : 1.0;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
  });

  return (
    <group
      ref={meshRef}
      position={[x, y, z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Sleek glass card border */}
      <mesh castShadow receiveShadow>
        <planeGeometry args={[1.3, 1.7]} />
        <meshPhysicalMaterial
          color="#c9a84c"
          roughness={0.15}
          metalness={0.1}
          transparent
          opacity={hovered ? 0.3 : 0.1}
          transmission={0.6}
          thickness={0.5}
          clearcoat={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer gold border line */}
      <mesh position={[0, 0, 0.005]}>
        <ringGeometry args={[0.9, 0.92, 4]} />
        <meshBasicMaterial color="#c9a84c" transparent opacity={hovered ? 0.8 : 0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Floating clothing item texture plane */}
      {texture && !textureError ? (
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[1.1, 1.5]} />
          <meshBasicMaterial
            map={texture}
            transparent
            alphaTest={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : (
        /* Fallback if texture fails or loading */
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[1.1, 1.5]} />
          <meshStandardMaterial color="#222" roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ─── Rotating Shelf group ─────────────────────────────────────
function ClosetRack({ items, onSelectItem }: ClosetSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [active, setActive] = useState(true);

  useFrame((_state) => {
    if (!groupRef.current || !active) return;
    // Slow ambient rotation of the entire circle when not dragging controls
    groupRef.current.rotation.y += 0.0015;
  });

  return (
    <group
      ref={groupRef}
      onPointerDown={() => setActive(false)} // stop rotation when user interacts
      onPointerUp={() => setActive(true)}
    >
      {items.map((item, idx) => (
        <ClosetCard
          key={item.id}
          item={item}
          index={idx}
          total={items.length}
          onSelect={() => onSelectItem?.(item)}
        />
      ))}

      {/* Abstract gold center pillar */}
      <mesh position={[0, -2, 0]}>
        <cylinderGeometry args={[0.1, 0.2, 5, 32]} />
        <meshStandardMaterial color="#c9a84c" metalness={0.8} roughness={0.2} transparent opacity={0.15} />
      </mesh>
      {/* Base ring */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3, 3.05, 64]} />
        <meshBasicMaterial color="#c9a84c" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

export function ClosetScene({ items, onSelectItem }: ClosetSceneProps) {
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
      {/* R3F Canvas */}
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center gap-3">
            <Loader2 className="animate-spin text-gold-500" size={24} />
            <span className="text-sm text-charcoal-400 font-medium">Assembling Closet...</span>
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 1.5, 7.5], fov: isMobile ? 65 : 55 }}
          shadows
          gl={{ antialias: true, alpha: true }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 15, 10]} intensity={1.5} castShadow />
          <spotLight
            position={[0, 10, 0]}
            intensity={1.2}
            angle={0.6}
            penumbra={0.5}
            castShadow
          />
          <directionalLight position={[-5, 5, -5]} intensity={0.5} />

          {/* Sparkles / particle drift */}
          <Sparkles
            count={isMobile ? 30 : 70}
            scale={8}
            size={isMobile ? 1.5 : 2}
            speed={0.4}
            color="#c9a84c"
          />

          <Center>
            <ClosetRack items={items} onSelectItem={onSelectItem} />
          </Center>

          {/* Controls */}
          <OrbitControls
            enableZoom={true}
            maxDistance={12}
            minDistance={4}
            maxPolarAngle={Math.PI / 1.8}
            minPolarAngle={Math.PI / 3}
            enablePan={false}
            autoRotate={false}
          />
        </Canvas>
      </Suspense>

      {/* Floating Instructions HUD */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass px-4 py-2 text-xs text-charcoal-400 flex items-center gap-2 pointer-events-none select-none">
        <span>Orbit: Left Click + Drag</span>
        <span className="opacity-40">|</span>
        <span>Inspect: Click Card</span>
      </div>
    </div>
  );
}
export default ClosetScene;
