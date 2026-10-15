// Adaptado por FlowCore Soluções LTDA · flowcoresolucoes.com.br/codigos
// Original: inspirado no 3D Globe da Aceternity UI (MIT). Mantenha este crédito.

// @ts-nocheck
// Globe 3D — Three.js puro (sem drei). Esfera com markers clicáveis + atmosfera.
// Inspirado em Aceternity 3D Globe.

import { useEffect, useRef } from "react";
import * as THREE from "three";

const latLngToVec3 = (lat, lng, radius) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(-(radius * Math.sin(phi) * Math.cos(theta)), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
};

const DEFAULT_MARKERS = [
  { lat: -23.5, lng: -46.6, label: "São Paulo" },
  { lat: 40.7, lng: -74.0, label: "New York" },
  { lat: 51.5, lng: -0.12, label: "London" },
  { lat: 35.6, lng: 139.6, label: "Tokyo" },
  { lat: -33.8, lng: 151.2, label: "Sydney" },
];

const Globe3D = ({ markers = DEFAULT_MARKERS, autoRotate = true } = {}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.offsetWidth || 1, h = container.offsetHeight || 1;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.z = 7;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const RADIUS = 2;
    // Globe
    const globeGeom = new THREE.SphereGeometry(RADIUS, 64, 64);
    const globeMat = new THREE.MeshPhongMaterial({ color: 0x0066FF, emissive: 0x001a4d, emissiveIntensity: 0.4, shininess: 25 });
    const globe = new THREE.Mesh(globeGeom, globeMat);
    scene.add(globe);
    // Wireframe overlay
    const wireGeom = new THREE.SphereGeometry(RADIUS * 1.005, 24, 12);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x3FB5FF, wireframe: true, transparent: true, opacity: 0.18 });
    scene.add(new THREE.Mesh(wireGeom, wireMat));
    // Atmosphere
    const atmGeom = new THREE.SphereGeometry(RADIUS * 1.12, 32, 32);
    const atmMat = new THREE.ShaderMaterial({
      uniforms: { c: { value: new THREE.Color(0x4DA6FF) } },
      vertexShader: `varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform vec3 c;varying vec3 vN;void main(){float i=pow(0.65-dot(vN,vec3(0,0,1.0)),2.0);gl_FragColor=vec4(c,i*0.8);}`,
      side: THREE.BackSide, transparent: true, depthWrite: false,
    });
    scene.add(new THREE.Mesh(atmGeom, atmMat));

    // Markers
    markers.forEach((m) => {
      const pos = latLngToVec3(m.lat, m.lng, RADIUS * 1.001);
      const top = latLngToVec3(m.lat, m.lng, RADIUS * 1.18);
      const dir = top.clone().sub(pos).normalize();
      const center = pos.clone().lerp(top, 0.5);
      const q = new THREE.Quaternion(); q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      // Pin line
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, top.distanceTo(pos), 8), new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.6 }));
      line.position.copy(center); line.quaternion.copy(q); globe.add(line);
      // Cone
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      cone.position.copy(pos); cone.quaternion.copy(q); globe.add(cone);
      // Top sphere
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshBasicMaterial({ color: 0x3FB5FF }));
      dot.position.copy(top); globe.add(dot);
    });

    // Lights
    scene.add(new THREE.AmbientLight(0x4DA6FF, 0.4));
    const dir1 = new THREE.DirectionalLight(0xffffff, 1.5); dir1.position.set(5, 3, 5); scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0x88ccff, 0.6); dir2.position.set(-3, 1, -2); scene.add(dir2);

    const resize = () => { const W = container.offsetWidth, H = container.offsetHeight; renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(container);

    let raf, dragging = false, lx = 0, vx = 0;
    const onDown = (e) => { dragging = true; lx = e.clientX; };
    const onMove = (e) => { if (!dragging) return; vx = (e.clientX - lx) * 0.005; lx = e.clientX; };
    const onUp = () => { dragging = false; };
    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (autoRotate && !dragging) globe.rotation.y += 0.003;
      if (Math.abs(vx) > 0.001) { globe.rotation.y += vx; vx *= 0.94; }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
      renderer.dispose(); renderer.forceContextLoss();
      globeGeom.dispose(); globeMat.dispose(); wireGeom.dispose(); wireMat.dispose(); atmGeom.dispose(); atmMat.dispose();
    };
  }, [markers, autoRotate]);

  return <div ref={containerRef} style={{ position: "relative", height: "100%", width: "100%" }} />;
};

export default Globe3D;
