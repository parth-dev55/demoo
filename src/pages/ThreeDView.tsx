import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import * as THREE from 'three';
import { 
  Box, 
  Layers, 
  Sun, 
  CloudRain, 
  Moon, 
  RotateCw, 
  Eye, 
  Zap, 
  Droplets, 
  Thermometer, 
  Compass, 
  Sparkles,
  Activity,
  Wind
} from 'lucide-react';

interface PlotData {
  id: string;
  name: string;
  crop: string;
  area: string;
  moisture: number;
  nitrogen: string;
  temp: number;
  health: number;
  status: 'Optimal' | 'Requires Nitrogen' | 'Needs Irrigation' | 'Harvest Ready';
  color: string;
  gridPos: { x: number; z: number; w: number; d: number };
}

const PLOTS: PlotData[] = [
  { 
    id: 'plot-1', 
    name: 'Sector Alpha - Wheat', 
    crop: 'Durum Wheat', 
    area: '4.2 Hectares', 
    moisture: 72, 
    nitrogen: 'High (140 kg/ha)', 
    temp: 24.5, 
    health: 94, 
    status: 'Optimal', 
    color: '#10b981',
    gridPos: { x: -22, z: -18, w: 38, d: 32 } 
  },
  { 
    id: 'plot-2', 
    name: 'Sector Beta - Corn', 
    crop: 'Hybrid Maize', 
    area: '3.8 Hectares', 
    moisture: 48, 
    nitrogen: 'Low (75 kg/ha)', 
    temp: 28.1, 
    health: 78, 
    status: 'Requires Nitrogen', 
    color: '#f59e0b',
    gridPos: { x: 22, z: -18, w: 38, d: 32 } 
  },
  { 
    id: 'plot-3', 
    name: 'Sector Gamma - Tomato', 
    crop: 'Cherry Tomatoes', 
    area: '2.1 Hectares', 
    moisture: 38, 
    nitrogen: 'Medium (110 kg/ha)', 
    temp: 29.4, 
    health: 65, 
    status: 'Needs Irrigation', 
    color: '#ef4444',
    gridPos: { x: -22, z: 18, w: 38, d: 32 } 
  },
  { 
    id: 'plot-4', 
    name: 'Sector Delta - Cotton', 
    crop: 'Organic Cotton', 
    area: '5.5 Hectares', 
    moisture: 82, 
    nitrogen: 'Optimal (130 kg/ha)', 
    temp: 23.8, 
    health: 98, 
    status: 'Harvest Ready', 
    color: '#3b82f6',
    gridPos: { x: 22, z: 18, w: 38, d: 32 } 
  }
];

export function ThreeDView() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // 3D Viewport Controls State
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'ground'>('iso');
  const [timeOfDay, setTimeOfDay] = useState<'dawn' | 'noon' | 'sunset' | 'night'>('noon');
  const [weather, setWeather] = useState<'clear' | 'rain' | 'cloudy'>('clear');
  const [activeLayer, setActiveLayer] = useState<'standard' | 'moisture' | 'ndvi' | 'thermal'>('standard');
  const [showDrone, setShowDrone] = useState(true);
  const [showSprinklers, setShowSprinklers] = useState(true);

  // Selection & Telemetry State
  const [selectedPlot, setSelectedPlot] = useState<PlotData>(PLOTS[0]);
  const [isIrrigating, setIsIrrigating] = useState(false);
  const [cameraAngles, setCameraAngles] = useState({ pitch: 45, yaw: 45 });

  // Refs for animation & interactive raycasting
  const activeLayerRef = useRef(activeLayer);
  const selectedPlotRef = useRef(selectedPlot);
  const timeOfDayRef = useRef(timeOfDay);
  const weatherRef = useRef(weather);
  const showDroneRef = useRef(showDrone);
  const showSprinklersRef = useRef(showSprinklers);
  const isIrrigatingRef = useRef(isIrrigating);

  useEffect(() => { activeLayerRef.current = activeLayer; }, [activeLayer]);
  useEffect(() => { selectedPlotRef.current = selectedPlot; }, [selectedPlot]);
  useEffect(() => { timeOfDayRef.current = timeOfDay; }, [timeOfDay]);
  useEffect(() => { weatherRef.current = weather; }, [weather]);
  useEffect(() => { showDroneRef.current = showDrone; }, [showDrone]);
  useEffect(() => { showSprinklersRef.current = showSprinklers; }, [showSprinklers]);
  useEffect(() => { isIrrigatingRef.current = isIrrigating; }, [isIrrigating]);

  // Orbit camera control refs
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sphericalRef = useRef({ radius: 120, theta: Math.PI / 4, phi: Math.PI / 4 });
  const isDraggingRef = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#09090b');
    scene.fog = new THREE.FogExp2('#09090b', 0.003);

    // 2. Camera Setup
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;

    const updateCameraPos = () => {
      const { radius, theta, phi } = sphericalRef.current;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 0, 0);

      // Pitch & Yaw in degrees for HUD
      const pitchDeg = Math.round((phi * 180) / Math.PI);
      const yawDeg = Math.round((theta * 180) / Math.PI);
      setCameraAngles({ pitch: pitchDeg, yaw: yawDeg });
    };
    updateCameraPos();

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Enforce 100% block CSS on canvas element so it matches container flex bounds exactly
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    // Clear previous elements
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting System
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    dirLight.position.set(60, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 300;
    const d = 80;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x0f2010, 0.4);
    scene.add(hemiLight);

    // 5. Build 3D Terrain & Soil Extrusion Base
    const terrainWidth = 100;
    const terrainDepth = 80;

    // Sub-surface Soil Extrusion Box
    const soilGeo = new THREE.BoxGeometry(terrainWidth, 12, terrainDepth);
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x1f1913, roughness: 0.9 });
    const soilMesh = new THREE.Mesh(soilGeo, soilMat);
    soilMesh.position.y = -6;
    soilMesh.receiveShadow = true;
    scene.add(soilMesh);

    // Top Surface Ground Plane
    const groundGeo = new THREE.PlaneGeometry(terrainWidth, terrainDepth, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x1a3322, 
      roughness: 0.85, 
      metalness: 0.1 
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Grid Overlay Lines
    const gridHelper = new THREE.GridHelper(100, 20, 0x10b981, 0x27272a);
    gridHelper.position.y = 0.05;
    scene.add(gridHelper);

    // Dirt Roads dividing sectors
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x3d3228, roughness: 0.95 });
    
    const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(100, 4), roadMat);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.y = 0.08;
    scene.add(hRoad);

    const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(4, 80), roadMat);
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.y = 0.08;
    scene.add(vRoad);

    // 6. Build 3D Farm Sectors / Plots
    const plotMeshesMap = new Map<string, THREE.Mesh>();
    const plotBorderMap = new Map<string, THREE.LineSegments>();

    PLOTS.forEach((plot) => {
      const pGeo = new THREE.PlaneGeometry(plot.gridPos.w, plot.gridPos.d);
      const pMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(plot.color),
        roughness: 0.6,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.rotation.x = -Math.PI / 2;
      pMesh.position.set(plot.gridPos.x, 0.12, plot.gridPos.z);
      pMesh.receiveShadow = true;
      pMesh.userData = { plotData: plot };
      scene.add(pMesh);
      plotMeshesMap.set(plot.id, pMesh);

      // Plot Outline Highlight
      const edges = new THREE.EdgesGeometry(pGeo);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 });
      const line = new THREE.LineSegments(edges, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(plot.gridPos.x, 0.15, plot.gridPos.z);
      scene.add(line);
      plotBorderMap.set(plot.id, line);

      // 7. Instantiate 3D Plant/Crop Models inside each plot
      const cropGroup = new THREE.Group();
      cropGroup.position.set(plot.gridPos.x, 0.2, plot.gridPos.z);

      const rows = 12;
      const cols = 14;
      const xSpacing = plot.gridPos.w / cols;
      const zSpacing = plot.gridPos.d / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const px = -plot.gridPos.w / 2 + c * xSpacing + xSpacing / 2;
          const pz = -plot.gridPos.d / 2 + r * zSpacing + zSpacing / 2;

          if (plot.id === 'plot-1') {
            // Wheat Stalk (Golden Stem + Tip)
            const stalkGeo = new THREE.CylinderGeometry(0.08, 0.05, 1.4, 5);
            const stalkMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 });
            const stalk = new THREE.Mesh(stalkGeo, stalkMat);
            stalk.position.set(px, 0.7, pz);
            stalk.castShadow = true;
            cropGroup.add(stalk);
          } else if (plot.id === 'plot-2') {
            // Corn Plant (Green Stem + Tassel)
            const cornGeo = new THREE.CylinderGeometry(0.12, 0.08, 2.2, 6);
            const cornMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 });
            const corn = new THREE.Mesh(cornGeo, cornMat);
            corn.position.set(px, 1.1, pz);
            corn.castShadow = true;

            // Leaf tassel
            const tasselGeo = new THREE.ConeGeometry(0.4, 0.8, 4);
            const tasselMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
            const tassel = new THREE.Mesh(tasselGeo, tasselMat);
            tassel.position.y = 1.2;
            corn.add(tassel);

            cropGroup.add(corn);
          } else if (plot.id === 'plot-3') {
            // Tomato Vine Bush (Dark Green Sphere + Red Tomatoes)
            const bushGeo = new THREE.DodecahedronGeometry(0.7, 1);
            const bushMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7 });
            const bush = new THREE.Mesh(bushGeo, bushMat);
            bush.position.set(px, 0.7, pz);
            bush.castShadow = true;

            // Tomato fruit
            const tomatoGeo = new THREE.SphereGeometry(0.2, 8, 8);
            const tomatoMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
            const tomato = new THREE.Mesh(tomatoGeo, tomatoMat);
            tomato.position.set(0.3, 0.2, 0.3);
            bush.add(tomato);

            cropGroup.add(bush);
          } else {
            // Cotton Plant (Bush + White Cotton Bolls)
            const bushGeo = new THREE.SphereGeometry(0.6, 8, 8);
            const bushMat = new THREE.MeshStandardMaterial({ color: 0x1e8549, roughness: 0.8 });
            const bush = new THREE.Mesh(bushGeo, bushMat);
            bush.position.set(px, 0.6, pz);
            bush.castShadow = true;

            const bollGeo = new THREE.SphereGeometry(0.25, 8, 8);
            const bollMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
            const boll = new THREE.Mesh(bollGeo, bollMat);
            boll.position.set(0, 0.5, 0);
            bush.add(boll);

            cropGroup.add(bush);
          }
        }
      }
      scene.add(cropGroup);
    });

    // 8. Build 3D Farm Infrastructure (Farmhouse, Silos, Wind Turbines, Water Reservoir)
    const infraGroup = new THREE.Group();

    // A. Main Farm Barn/House
    const barnBodyGeo = new THREE.BoxGeometry(10, 6, 8);
    const barnBodyMat = new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.5 }); // Red brick/barn
    const barnBody = new THREE.Mesh(barnBodyGeo, barnBodyMat);
    barnBody.position.set(0, 3, -34);
    barnBody.castShadow = true;
    barnBody.receiveShadow = true;

    // Pitched Roof
    const roofGeo = new THREE.ConeGeometry(8, 4, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.3 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, 8, -34);
    roof.scale.set(1.1, 1, 1);
    roof.castShadow = true;

    // Glowing Barn Windows
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const win1 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), windowMat);
    win1.position.set(-2.5, 3.5, -29.9);
    const win2 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), windowMat);
    win2.position.set(2.5, 3.5, -29.9);
    infraGroup.add(barnBody, roof, win1, win2);

    // B. Grain Silo Towers
    const siloGeo = new THREE.CylinderGeometry(2.5, 2.5, 12, 16);
    const siloMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const silo1 = new THREE.Mesh(siloGeo, siloMat);
    silo1.position.set(-10, 6, -34);
    silo1.castShadow = true;

    const domeGeo = new THREE.SphereGeometry(2.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.1 });
    const dome1 = new THREE.Mesh(domeGeo, domeMat);
    dome1.position.set(-10, 12, -34);

    infraGroup.add(silo1, dome1);

    // C. 3D Wind Turbines with spinning blades
    const turbineBladesGroup: THREE.Group[] = [];

    const createWindTurbine = (x: number, z: number) => {
      const towerGeo = new THREE.CylinderGeometry(0.3, 0.7, 20, 12);
      const towerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.set(x, 10, z);
      tower.castShadow = true;

      const nacelleGeo = new THREE.BoxGeometry(1, 1, 2);
      const nacelle = new THREE.Mesh(nacelleGeo, towerMat);
      nacelle.position.set(x, 20, z);

      const bladesGroup = new THREE.Group();
      bladesGroup.position.set(x, 20, z + 1.1);

      for (let i = 0; i < 3; i++) {
        const bladeGeo = new THREE.BoxGeometry(0.3, 6, 0.1);
        const blade = new THREE.Mesh(bladeGeo, towerMat);
        blade.rotation.z = (i * Math.PI * 2) / 3;
        blade.position.y = 2.5 * Math.cos((i * Math.PI * 2) / 3);
        blade.position.x = -2.5 * Math.sin((i * Math.PI * 2) / 3);
        bladesGroup.add(blade);
      }

      turbineBladesGroup.push(bladesGroup);
      infraGroup.add(tower, nacelle, bladesGroup);
    };

    createWindTurbine(-42, -32);
    createWindTurbine(42, -32);

    // D. Water Reservoir Pool
    const poolGeo = new THREE.CylinderGeometry(6, 6, 0.8, 24);
    const poolWallMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.8 });
    const poolWall = new THREE.Mesh(poolGeo, poolWallMat);
    poolWall.position.set(38, 0.4, 0);

    const waterGeo = new THREE.CircleGeometry(5.8, 24);
    const waterMat = new THREE.MeshStandardMaterial({ 
      color: 0x0284c7, 
      roughness: 0.1, 
      metalness: 0.8,
      transparent: true,
      opacity: 0.9 
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(38, 0.82, 0);

    infraGroup.add(poolWall, waterMesh);
    scene.add(infraGroup);

    // 9. 3D Quadcopter AI Drone
    const droneGroup = new THREE.Group();
    droneGroup.position.set(0, 18, 0);

    const droneBody = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.5, 2),
      new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.8, roughness: 0.2 })
    );
    droneGroup.add(droneBody);

    // Laser Cone Scanner Projection
    const laserGeo = new THREE.ConeGeometry(12, 18, 16, 1, true);
    const laserMat = new THREE.MeshBasicMaterial({ 
      color: 0x34d399, 
      transparent: true, 
      opacity: 0.25, 
      side: THREE.DoubleSide 
    });
    const laserCone = new THREE.Mesh(laserGeo, laserMat);
    laserCone.position.set(0, -9, 0);
    droneGroup.add(laserCone);
    scene.add(droneGroup);

    // 10. 3D Irrigation Sprinklers & Water Particles
    const sprinklerGroups: THREE.Group[] = [];
    PLOTS.forEach(plot => {
      const sGroup = new THREE.Group();
      sGroup.position.set(plot.gridPos.x, 0.1, plot.gridPos.z);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 2.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7 })
      );
      pole.position.y = 1.25;

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      head.position.y = 2.5;

      sGroup.add(pole, head);
      sprinklerGroups.push(sGroup);
      scene.add(sGroup);
    });

    // Water Spray Particles
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      particlePositions[i] = (Math.random() - 0.5) * 20;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.3, transparent: true, opacity: 0.7 });
    const sprayParticles = new THREE.Points(particleGeo, particleMat);
    sprayParticles.visible = false;
    scene.add(sprayParticles);

    // 11. Rain Particle System
    const rainCount = 1200;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 120;
      rainPositions[i * 3 + 1] = Math.random() * 80;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.25, transparent: true, opacity: 0.6 });
    const rainParticles = new THREE.Points(rainGeo, rainMat);
    rainParticles.visible = false;
    scene.add(rainParticles);

    // 12. Interactive Mouse / Touch Orbit Controls & Raycasting Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isDraggingRef.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      previousMousePosition.current = { x: clientX, y: clientY };
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - previousMousePosition.current.x;
      const deltaY = clientY - previousMousePosition.current.y;

      sphericalRef.current.theta -= deltaX * 0.008;
      sphericalRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, sphericalRef.current.phi - deltaY * 0.008));

      previousMousePosition.current = { x: clientX, y: clientY };
      updateCameraPos();
    };

    const handlePointerUp = (e: MouseEvent | TouchEvent) => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      sphericalRef.current.radius = Math.max(40, Math.min(220, sphericalRef.current.radius + e.deltaY * 0.1));
      updateCameraPos();
    };

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(plotMeshesMap.values());
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        const clickedPlot = clickedMesh.userData.plotData as PlotData;
        if (clickedPlot) {
          setSelectedPlot(clickedPlot);
        }
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('mousedown', handlePointerDown);
    domElem.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    domElem.addEventListener('touchstart', handlePointerDown);
    domElem.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);
    domElem.addEventListener('wheel', handleWheel);
    domElem.addEventListener('click', handleClick);

    // 13. Container ResizeObserver (Handles sidebar toggle, layout shifts, window resize)
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      if (renderer.domElement) {
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        handleResize();
      });
    });
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // 14. Main Animation Render Loop
    let clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Spin Wind Turbines
      turbineBladesGroup.forEach(bg => {
        bg.rotation.z += 0.03;
      });

      // Animate AI Drone Hover & Scan Sweep
      if (showDroneRef.current) {
        droneGroup.visible = true;
        droneGroup.position.x = Math.sin(elapsedTime * 0.8) * 25;
        droneGroup.position.z = Math.cos(elapsedTime * 0.6) * 18;
        droneGroup.position.y = 18 + Math.sin(elapsedTime * 2) * 0.8;
      } else {
        droneGroup.visible = false;
      }

      // Sprinklers & Water Spray Particles
      sprayParticles.visible = showSprinklersRef.current && isIrrigatingRef.current;
      if (sprayParticles.visible) {
        const activePlot = selectedPlotRef.current;
        sprayParticles.position.set(activePlot.gridPos.x, 2, activePlot.gridPos.z);
        const positions = sprayParticles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          positions[i * 3 + 1] -= 0.15;
          if (positions[i * 3 + 1] < -1.5) {
            positions[i * 3 + 1] = 1.5;
          }
        }
        sprayParticles.geometry.attributes.position.needsUpdate = true;
      }

      // Rain Particles Animation
      if (weatherRef.current === 'rain') {
        rainParticles.visible = true;
        const positions = rainParticles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < rainCount; i++) {
          positions[i * 3 + 1] -= 1.2;
          if (positions[i * 3 + 1] < 0) {
            positions[i * 3 + 1] = 80;
          }
        }
        rainParticles.geometry.attributes.position.needsUpdate = true;
      } else {
        rainParticles.visible = false;
      }

      // Update Layer Shading & Colors
      PLOTS.forEach(plot => {
        const mesh = plotMeshesMap.get(plot.id);
        const line = plotBorderMap.get(plot.id);
        if (!mesh) return;

        const isSelected = selectedPlotRef.current.id === plot.id;
        if (line) {
          line.visible = isSelected;
        }

        const mat = mesh.material as THREE.MeshStandardMaterial;
        const layer = activeLayerRef.current;

        if (layer === 'moisture') {
          // Blue gradient for moisture
          const hue = 0.55 + (plot.moisture / 100) * 0.15;
          mat.color.setHSL(hue, 0.8, 0.4);
        } else if (layer === 'ndvi') {
          // Bright green for high NDVI
          const hue = (plot.health / 100) * 0.35;
          mat.color.setHSL(hue, 0.9, 0.45);
        } else if (layer === 'thermal') {
          // Red/orange for thermal heat
          mat.color.setHex(plot.temp > 28 ? 0xef4444 : plot.temp > 25 ? 0xf59e0b : 0x3b82f6);
        } else {
          // Standard crop color
          mat.color.set(plot.color);
        }
      });

      // Time of Day Environment Lighting Adjustment
      const tod = timeOfDayRef.current;
      if (tod === 'dawn') {
        ambientLight.color.setHex(0xfdba74);
        ambientLight.intensity = 0.5;
        dirLight.color.setHex(0xfb923c);
        dirLight.position.set(-80, 20, 40);
        scene.background = new THREE.Color('#1c1917');
      } else if (tod === 'noon') {
        ambientLight.color.setHex(0xffffff);
        ambientLight.intensity = 0.6;
        dirLight.color.setHex(0xfffaed);
        dirLight.position.set(60, 100, 50);
        scene.background = new THREE.Color('#09090b');
      } else if (tod === 'sunset') {
        ambientLight.color.setHex(0xd8b4fe);
        ambientLight.intensity = 0.4;
        dirLight.color.setHex(0xf43f5e);
        dirLight.position.set(80, 15, -40);
        scene.background = new THREE.Color('#1e1b4b');
      } else {
        // Night
        ambientLight.color.setHex(0x38bdf8);
        ambientLight.intensity = 0.2;
        dirLight.color.setHex(0x60a5fa);
        dirLight.position.set(30, 80, 30);
        scene.background = new THREE.Color('#020617');
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      domElem.removeEventListener('mousedown', handlePointerDown);
      domElem.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      domElem.removeEventListener('touchstart', handlePointerDown);
      domElem.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      domElem.removeEventListener('wheel', handleWheel);
      domElem.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // Quick Camera Presets
  const applyPreset = (preset: 'iso' | 'top' | 'ground') => {
    setCameraPreset(preset);
    if (!cameraRef.current) return;
    if (preset === 'iso') {
      sphericalRef.current = { radius: 120, theta: Math.PI / 4, phi: Math.PI / 4 };
    } else if (preset === 'top') {
      sphericalRef.current = { radius: 110, theta: 0.01, phi: 0.05 };
    } else if (preset === 'ground') {
      sphericalRef.current = { radius: 55, theta: Math.PI / 6, phi: Math.PI / 2.3 };
    }
    const { radius, theta, phi } = sphericalRef.current;
    cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = radius * Math.cos(phi);
    cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(0, 0, 0);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] text-zinc-100 overflow-hidden relative">
      {/* Top Header Control Ribbon */}
      <div className="min-h-14 bg-[#121215] border-b border-zinc-800/80 px-3 md:px-4 py-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-zinc-100 flex items-center gap-2 flex-wrap">
              Digital Twin 3D Farm Studio
              <span className="text-[9px] sm:text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Three.js WebGL Engine
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-zinc-400">Real-time 3D spatial telemetry, crops, infrastructure & climate control</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {/* Layer Selection */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 shrink-0">
            <button
              onClick={() => setActiveLayer('standard')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                activeLayer === 'standard' ? 'bg-emerald-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Standard 3D
            </button>
            <button
              onClick={() => setActiveLayer('moisture')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                activeLayer === 'moisture' ? 'bg-sky-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Soil Moisture
            </button>
            <button
              onClick={() => setActiveLayer('ndvi')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                activeLayer === 'ndvi' ? 'bg-emerald-400 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              NDVI Canopy
            </button>
            <button
              onClick={() => setActiveLayer('thermal')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                activeLayer === 'thermal' ? 'bg-rose-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Thermal Heat
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-800 shrink-0" />

          {/* Time of Day Toggle */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1 shrink-0">
            <button
              onClick={() => setTimeOfDay('noon')}
              className={`p-1.5 rounded-md transition-colors ${timeOfDay === 'noon' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-zinc-400'}`}
              title="Noon Day Lighting"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTimeOfDay('sunset')}
              className={`p-1.5 rounded-md transition-colors ${timeOfDay === 'sunset' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-zinc-400'}`}
              title="Sunset Twilight"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTimeOfDay('night')}
              className={`p-1.5 rounded-md transition-colors ${timeOfDay === 'night' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-zinc-400'}`}
              title="Night Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Weather Presets */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1 shrink-0">
            <button
              onClick={() => setWeather(weather === 'rain' ? 'clear' : 'rain')}
              className={`p-1.5 rounded-md transition-colors ${weather === 'rain' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-zinc-400'}`}
              title="Toggle 3D Rain Effect"
            >
              <CloudRain className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-y-auto md:overflow-hidden min-h-0">
        
        {/* Floating Left Camera HUD Controls */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 bg-[#121215]/90 border border-zinc-800/80 p-1.5 rounded-xl backdrop-blur-md shadow-2xl">
          <button
            onClick={() => applyPreset('iso')}
            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              cameraPreset === 'iso' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-900 text-zinc-400'
            }`}
            title="Isometric View"
          >
            ISO 3D
          </button>
          <button
            onClick={() => applyPreset('top')}
            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              cameraPreset === 'top' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-900 text-zinc-400'
            }`}
            title="Satellite Aerial Top-Down View"
          >
            AERIAL
          </button>
          <button
            onClick={() => applyPreset('ground')}
            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              cameraPreset === 'ground' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-900 text-zinc-400'
            }`}
            title="Ground Level View"
          >
            FIELD
          </button>

          <div className="h-px bg-zinc-800 my-0.5" />

          <button
            onClick={() => setShowDrone(!showDrone)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              showDrone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-900 text-zinc-500'
            }`}
            title="Toggle AI Drone Scanner"
          >
            <Wind className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowSprinklers(!showSprinklers)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              showSprinklers ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-zinc-900 text-zinc-500'
            }`}
            title="Toggle Smart Sprinklers"
          >
            <Droplets className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating Orbit Help Tip */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-20 text-[10px] sm:text-[11px] font-mono text-zinc-400 bg-zinc-900/90 border border-zinc-800/80 px-2.5 py-1.5 rounded-lg backdrop-blur-sm pointer-events-none flex items-center gap-2 truncate">
          <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" style={{ animationDuration: '8s' }} />
          <span>Click/Touch Plot to Select • Orbit: Pitch {cameraAngles.pitch}° Yaw {cameraAngles.yaw}°</span>
        </div>

        {/* Three.js Canvas Mount */}
        <div 
          ref={mountRef}
          className="w-full h-[360px] sm:h-[450px] md:h-full flex-1 cursor-grab active:cursor-grabbing relative min-w-0 overflow-hidden"
        />

        {/* Right Plot Diagnostics Sidebar */}
        <div className="w-full md:w-[320px] bg-[#121215]/95 border-t md:border-t-0 md:border-l border-zinc-800/80 p-3 sm:p-4 z-20 flex flex-col gap-4 overflow-y-auto backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Plot Sector Inspector
            </h2>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Live Telemetry
            </span>
          </div>

          {/* Plot Selector Chips */}
          <div className="grid grid-cols-2 gap-2">
            {PLOTS.map((plot) => {
              const isSelected = selectedPlot.id === plot.id;
              return (
                <button
                  key={plot.id}
                  onClick={() => setSelectedPlot(plot)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected 
                      ? 'bg-emerald-950/30 border-emerald-500 text-zinc-100 ring-1 ring-emerald-500/50' 
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="text-[11px] font-bold truncate">{plot.crop}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{plot.name.split('-')[0]}</div>
                </button>
              );
            })}
          </div>

          {/* Selected Plot Detailed Telemetry */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-100">{selectedPlot.name}</h3>
                <p className="text-xs text-zinc-400">{selectedPlot.area} • {selectedPlot.crop}</p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                selectedPlot.status === 'Optimal' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                selectedPlot.status === 'Harvest Ready' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {selectedPlot.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-1">
                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-sky-400" /> Moisture
                </div>
                <div className="text-sm font-bold text-zinc-100">{selectedPlot.moisture}%</div>
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-400 rounded-full" style={{ width: `${selectedPlot.moisture}%` }} />
                </div>
              </div>

              <div className="p-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-1">
                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400" /> Canopy Health
                </div>
                <div className="text-sm font-bold text-zinc-100">{selectedPlot.health}%</div>
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${selectedPlot.health}%` }} />
                </div>
              </div>

              <div className="p-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-1">
                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-rose-400" /> Temperature
                </div>
                <div className="text-sm font-bold text-zinc-100">{selectedPlot.temp}°C</div>
                <div className="text-[9px] text-zinc-500">Soil Depth 15cm</div>
              </div>

              <div className="p-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-1">
                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> NPK Status
                </div>
                <div className="text-xs font-bold text-zinc-100 truncate">{selectedPlot.nitrogen}</div>
                <div className="text-[9px] text-zinc-500">Bio-sensor link</div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => setIsIrrigating(!isIrrigating)}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  isIrrigating 
                    ? 'bg-sky-500 text-zinc-950 shadow-lg shadow-sky-500/20' 
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                }`}
              >
                <Droplets className="w-4 h-4" />
                {isIrrigating ? 'Stop Automated Drip Irrigation' : 'Trigger Automated Drip Sprinkler'}
              </button>

              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-copilot', {
                    detail: { prompt: `Analyze 3D telemetry for ${selectedPlot.name} (${selectedPlot.crop}). Moisture: ${selectedPlot.moisture}%, Health: ${selectedPlot.health}%, Temp: ${selectedPlot.temp}°C, Status: ${selectedPlot.status}. What should I do next?` }
                  }));
                }}
                className="w-full py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                Ask AgriGPT About {selectedPlot.crop}
              </button>
            </div>
          </div>

          {/* AI Agronomist Recommendation Card */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                AgriGPT AI Field Diagnosis
              </div>
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-copilot', {
                    detail: { prompt: `Give me an in-depth agronomic advice for ${selectedPlot.name} (${selectedPlot.crop}).` }
                  }));
                }}
                className="text-[10px] text-emerald-400 hover:underline font-semibold"
              >
                Chat with Copilot →
              </button>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {selectedPlot.id === 'plot-2' 
                ? 'Nitrogen deficit detected in Sector Beta. Recommend applying 25kg/ha Bio-NPK Booster within 48 hours to preserve canopy expansion.' 
                : selectedPlot.id === 'plot-3'
                ? 'Soil moisture is at 38%. Drip irrigation recommended to avoid tomato blossom rot.'
                : 'Sector is performing at peak agronomic efficiency. No manual intervention needed.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
