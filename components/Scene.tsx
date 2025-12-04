import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useStore } from '../store';
import { SceneObject, ShapeType } from '../types';

// --- MATERIALS ---

const NeonMaterial = ({ color, isSelected }: { color: string, isSelected: boolean }) => (
  <meshStandardMaterial
    color={color}
    emissive={isSelected ? "#ffffff" : color}
    emissiveIntensity={isSelected ? 1.0 : 0.2} // Reduced intensity for realism
    roughness={0.4} // Increased roughness for more realistic material look
    metalness={0.8}
  />
);

// --- COMPONENTS ---

const Starfield = ({ count = 6000 }) => {
  const points = useRef<THREE.Points>(null);
  
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    
    for (let i = 0; i < count; i++) {
      const r = 100 + Math.random() * 800; // Much larger field
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      // Realistic Star Colors (Blue giants, Red dwarfs, White main sequence)
      const t = Math.random();
      if (t > 0.95) color.setHex(0xffaa88); // Reddish
      else if (t > 0.8) color.setHex(0x88ccff); // Blueish
      else if (t > 0.6) color.setHex(0xffddaa); // Yellow/Orange
      else color.setHex(0xffffff); // White
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return [positions, colors];
  }, [count]);

  useFrame(() => {
    if (points.current) {
      points.current.rotation.y -= 0.0001; // Very slow drift
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.6}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation={true}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

const Sun = () => {
  return (
    <group position={[50, 20, -100]}>
      {/* Core */}
      <mesh>
        <sphereGeometry args={[12, 64, 64]} />
        <meshBasicMaterial color="#fffdb0" toneMapped={false} />
      </mesh>
      {/* Inner Glow */}
      <mesh scale={1.1}>
        <sphereGeometry args={[12, 64, 64]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.4} side={THREE.BackSide} toneMapped={false} />
      </mesh>
      {/* Light Source */}
      <pointLight intensity={3} distance={500} decay={1.5} color="#ffddaa" />
    </group>
  );
};

const Planet = ({ 
  size, 
  distance, 
  speed, 
  color, 
  hasRings = false,
  offset = 0 
}: { 
  size: number, 
  distance: number, 
  speed: number, 
  color: string, 
  hasRings?: boolean,
  offset?: number
}) => {
  const ref = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime() * speed + offset;
      ref.current.position.x = Math.cos(t) * distance;
      ref.current.position.z = Math.sin(t) * distance;
      ref.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[size, 64, 64]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.7} 
          metalness={0.1} 
        />
      </mesh>
      {/* Atmosphere Glow */}
      <mesh scale={1.05}>
         <sphereGeometry args={[size, 64, 64]} />
         <meshBasicMaterial color={color} transparent opacity={0.1} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>
      {hasRings && (
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <ringGeometry args={[size * 1.4, size * 2.2, 128]} />
          <meshStandardMaterial 
            color={color} 
            transparent 
            opacity={0.3} 
            side={THREE.DoubleSide} 
          />
        </mesh>
      )}
    </group>
  );
};

const Shape: React.FC<{ data: SceneObject }> = ({ data }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const selectObject = useStore(state => state.selectObject);
  const selectedId = useStore(state => state.selectedId);
  
  const isSelected = selectedId === data.id;

  useFrame((state, delta) => {
    if (meshRef.current) {
      const targetPos = new THREE.Vector3(...data.position);
      meshRef.current.position.lerp(targetPos, 0.1); // Smoother lerp
      
      const targetScale = new THREE.Vector3(...data.scale);
      meshRef.current.scale.lerp(targetScale, 0.1);
      
      const targetRotation = new THREE.Euler(...data.rotation);
      const targetQuat = new THREE.Quaternion().setFromEuler(targetRotation);
      meshRef.current.quaternion.slerp(targetQuat, 0.1);
    }
  });

  const geometryMap = {
    [ShapeType.CUBE]: <boxGeometry args={[1.5, 1.5, 1.5]} />,
    [ShapeType.SPHERE]: <sphereGeometry args={[1, 64, 64]} />,
    [ShapeType.CYLINDER]: <cylinderGeometry args={[0.8, 0.8, 2, 64]} />,
    [ShapeType.TORUS]: <torusGeometry args={[0.8, 0.3, 32, 100]} />,
  };

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.2} enabled={!isSelected}>
      <mesh
        ref={meshRef}
        position={data.position} 
        rotation={data.rotation}
        scale={data.scale}
        onClick={(e) => {
          e.stopPropagation();
          selectObject(data.id);
        }}
        onPointerMissed={(e) => {
            if (e.type === 'click') selectObject(null);
        }}
        castShadow
        receiveShadow
      >
        {geometryMap[data.type]}
        <NeonMaterial color={data.color} isSelected={isSelected} />
        {isSelected && (
           <group>
             {/* Subtle Selection Box */}
             <lineSegments>
               <edgesGeometry args={[new THREE.BoxGeometry(2.1, 2.1, 2.1)]} />
               <lineBasicMaterial color="#ffffff" transparent opacity={0.15} />
             </lineSegments>
             {/* Selection Ring */}
             <mesh rotation={[Math.PI/2, 0, 0]}>
                <ringGeometry args={[1.5, 1.52, 64]} />
                <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} side={THREE.DoubleSide} />
             </mesh>
           </group>
        )}
      </mesh>
    </Float>
  );
};

const SceneContent = () => {
  const objects = useStore(state => state.objects);

  return (
    <>
      <Sun />
      <Starfield />
      
      {/* Space Dust / Nebula Effect */}
      <Sparkles count={500} scale={120} size={6} speed={0.4} opacity={0.2} color="#4488ff" />
      <Sparkles count={300} scale={90} size={10} speed={0.2} opacity={0.1} color="#ffaa44" />

      {/* Background Planets */}
      <Planet size={3} distance={60} speed={0.05} color="#4466ff" offset={0} />
      <Planet size={5} distance={100} speed={0.03} color="#eebb88" hasRings={true} offset={2.5} />
      
      <ambientLight intensity={0.05} />
      {/* Fill light for objects so they aren't pitch black on the dark side */}
      <directionalLight position={[-10, 10, 5]} intensity={0.2} color="#445588" />

      {objects.map(obj => <Shape key={obj.id} data={obj} />)}
      
      {/* Deep Space Fog */}
      <fogExp2 attach="fog" args={['#020205', 0.015]} />
    </>
  );
};

const Scene = () => {
  return (
    <div className="w-full h-screen bg-[#020205]">
      <Canvas 
        shadows 
        camera={{ position: [0, 5, 18], fov: 45 }} 
        gl={{ 
          antialias: false, 
          toneMapping: THREE.ReinhardToneMapping, 
          toneMappingExposure: 1.2,
          powerPreference: "high-performance"
        }}
      >
        <SceneContent />
        <OrbitControls makeDefault maxDistance={80} minDistance={5} enablePan={false} />
        <EffectComposer enableNormalPass={false}>
          <Bloom luminanceThreshold={0.9} mipmapBlur intensity={1.2} radius={0.4} />
          <Noise opacity={0.08} />
          <Vignette eskil={false} offset={0.1} darkness={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default Scene;