'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Move3D, 
  Eye, 
  Download,
  Maximize2,
  Settings,
  Layers,
  Ruler,
  Palette
} from 'lucide-react';

interface CADViewerProps {
  fileName: string;
  fileUrl?: string;
  fileData?: ArrayBuffer;
  className?: string;
  showControls?: boolean;
  showInfo?: boolean;
  height?: string;
}

interface ViewerControls {
  wireframe: boolean;
  showEdges: boolean;
  backgroundColor: string;
  opacity: number;
  autoRotate: boolean;
}

export default function CADViewer({
  fileName,
  fileUrl,
  fileData,
  className = "",
  showControls = true,
  showInfo = true,
  height = "400px"
}: CADViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [fileInfo, setFileInfo] = useState<any>(null);
  
  // Viewer controls
  const [controls, setControls] = useState<ViewerControls>({
    wireframe: false,
    showEdges: true,
    backgroundColor: '#f8fafc',
    opacity: 100,
    autoRotate: false
  });

  // Three.js references
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const modelRef = useRef<any>(null);

  useEffect(() => {
    initializeViewer();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (viewerReady && (fileUrl || fileData)) {
      loadCADFile();
    }
  }, [viewerReady, fileUrl, fileData]);

  const initializeViewer = async () => {
    try {
      setIsLoading(true);
      console.log(`[INFO] Initializing 3D CAD viewer for ${fileName}`);
      
      // Dynamic import of Three.js to avoid SSR issues
      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      
      if (!mountRef.current) return;

      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(controls.backgroundColor);
      sceneRef.current = scene;

      // Camera setup
      const camera = new THREE.PerspectiveCamera(
        75,
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.set(10, 10, 10);
      cameraRef.current = camera;

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;

      // Controls
      const orbitControls = new OrbitControls(camera, renderer.domElement);
      orbitControls.enableDamping = true;
      orbitControls.dampingFactor = 0.05;

      // Lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
      directionalLight2.position.set(-10, -10, -5);
      scene.add(directionalLight2);

      // Mount renderer
      mountRef.current.appendChild(renderer.domElement);

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        
        if (controls.autoRotate && modelRef.current) {
          modelRef.current.rotation.y += 0.005;
        }
        
        orbitControls.update();
        renderer.render(scene, camera);
      };
      animate();

      // Handle resize
      const handleResize = () => {
        if (!mountRef.current || !camera || !renderer) return;
        
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };
      
      window.addEventListener('resize', handleResize);

      setViewerReady(true);
      console.log('[INFO] 3D CAD viewer initialized successfully');
      
    } catch (err) {
      console.error('[ERROR] Failed to initialize 3D viewer:', err);
      setError('Failed to initialize 3D viewer');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCADFile = async () => {
    try {
      setIsLoading(true);
      console.log(`[INFO] Loading CAD file: ${fileName}`);

      // For demo purposes, load a simple placeholder geometry
      // In production, you'd use a STEP file loader like opencascade.js
      const THREE = await import('three');
      
      if (!sceneRef.current) return;

      // Remove existing model
      if (modelRef.current) {
        sceneRef.current.remove(modelRef.current);
      }

      // Create placeholder geometry based on file type
      let geometry;
      if (fileName.toLowerCase().includes('connector')) {
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
      } else if (fileName.toLowerCase().includes('housing')) {
        geometry = new THREE.BoxGeometry(2, 1, 3);
      } else {
        // Default complex shape
        geometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
      }

      const material = new THREE.MeshPhongMaterial({
        color: 0x00a8ff,
        shininess: 100,
        transparent: true,
        opacity: controls.opacity / 100,
        wireframe: controls.wireframe
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Add edges if enabled
      if (controls.showEdges && !controls.wireframe) {
        const edges = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
        const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
        mesh.add(edgeLines);
      }

      sceneRef.current.add(mesh);
      modelRef.current = mesh;

      // Center and scale model
      const box = new THREE.Box3().setFromObject(mesh);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      mesh.position.sub(center);
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 4 / maxDim;
      mesh.scale.setScalar(scale);

      // Update file info
      setFileInfo({
        fileName,
        vertices: geometry.attributes.position.count,
        faces: geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3,
        bounds: {
          width: size.x * scale,
          height: size.y * scale,
          depth: size.z * scale
        }
      });

      console.log(`[INFO] Successfully loaded ${fileName}`);
      
    } catch (err) {
      console.error('[ERROR] Failed to load CAD file:', err);
      setError('Failed to load CAD file');
    } finally {
      setIsLoading(false);
    }
  };

  const updateMaterial = () => {
    if (!modelRef.current) return;
    
    const material = modelRef.current.material;
    material.wireframe = controls.wireframe;
    material.opacity = controls.opacity / 100;
    material.needsUpdate = true;

    // Update edges visibility
    const edges = modelRef.current.children.find((child: any) => child.type === 'LineSegments');
    if (edges) {
      edges.visible = controls.showEdges && !controls.wireframe;
    }

    // Update background color
    if (sceneRef.current) {
      sceneRef.current.background.setStyle(controls.backgroundColor);
    }
  };

  useEffect(() => {
    updateMaterial();
  }, [controls]);

  const resetView = () => {
    if (!cameraRef.current || !modelRef.current) return;
    
    cameraRef.current.position.set(10, 10, 10);
    cameraRef.current.lookAt(0, 0, 0);
  };

  const downloadModel = () => {
    // In a real implementation, this would export the model
    console.log('[INFO] Download functionality would be implemented here');
  };

  const cleanup = () => {
    if (rendererRef.current && mountRef.current) {
      mountRef.current.removeChild(rendererRef.current.domElement);
    }
    
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <div className="text-lg font-semibold mb-2">Error Loading CAD File</div>
            <div className="text-sm">{error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            3D CAD Viewer
            <Badge variant="secondary">{fileName}</Badge>
          </CardTitle>
          {showControls && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={resetView}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={downloadModel}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative">
          {/* 3D Viewer */}
          <div 
            ref={mountRef} 
            className="w-full border-b"
            style={{ height }}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <div className="text-sm text-gray-600">Loading 3D model...</div>
                </div>
              </div>
            )}
          </div>

          {/* Controls Panel */}
          {showControls && !isLoading && (
            <div className="p-4 bg-gray-50 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Display Mode</label>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={controls.wireframe ? "default" : "outline"}
                      onClick={() => setControls(prev => ({ ...prev, wireframe: !prev.wireframe }))}
                    >
                      <Layers className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant={controls.showEdges ? "default" : "outline"}
                      onClick={() => setControls(prev => ({ ...prev, showEdges: !prev.showEdges }))}
                    >
                      <Ruler className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">Opacity: {controls.opacity}%</label>
                  <Slider
                    value={[controls.opacity]}
                    onValueChange={([value]) => setControls(prev => ({ ...prev, opacity: value }))}
                    max={100}
                    min={10}
                    step={10}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">Background</label>
                  <div className="flex gap-1">
                    {['#f8fafc', '#ffffff', '#1f2937', '#0f172a'].map((color) => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded border-2 ${controls.backgroundColor === color ? 'border-blue-500' : 'border-gray-300'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setControls(prev => ({ ...prev, backgroundColor: color }))}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">Animation</label>
                  <Button
                    size="sm"
                    variant={controls.autoRotate ? "default" : "outline"}
                    onClick={() => setControls(prev => ({ ...prev, autoRotate: !prev.autoRotate }))}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Rotate
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* File Info */}
          {showInfo && fileInfo && !isLoading && (
            <div className="p-4 bg-blue-50 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Vertices:</span>
                  <p>{fileInfo.vertices?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="font-medium">Faces:</span>
                  <p>{fileInfo.faces?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="font-medium">Dimensions:</span>
                  <p>{fileInfo.bounds?.width?.toFixed(2)} × {fileInfo.bounds?.height?.toFixed(2)} × {fileInfo.bounds?.depth?.toFixed(2)}</p>
                </div>
                <div>
                  <span className="font-medium">File Type:</span>
                  <p>STEP (.stp)</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 