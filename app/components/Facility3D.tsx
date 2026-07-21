"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Facility3D — rotating 3D rendering of the Exton Sports Center.
 *
 * Replaces the older animated-smiley SVG floor plan with an actual
 * isometric building view: outer shell, 3 squash courts on the right with
 * slanting translucent side walls and glass front + back walls (door on the
 * back, facing the fitness and locker zones), 4 badminton courts on the left
 * with standing nets and regulation court markings, 2 cricket lanes with
 * stumps + bails, and a small locker counter cluster.
 *
 * The canvas is transparent so the parent container's salmon + green
 * gradient backdrop reads through the floor.
 *
 * Performance: rAF is paused when the component is off-screen via
 * IntersectionObserver. WebGL context and geometries are disposed on
 * unmount.
 */
export default function Facility3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const BW = 572, BD = 392;
    const cx = BW / 2, cz = BD / 2;

    const scene = new THREE.Scene();

    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 420;

    const camera = new THREE.PerspectiveCamera(38, initialWidth / initialHeight, 1, 5000);
    let angle = Math.PI / 4;
    const camDist = 860, camHeight = 700;
    function updateCamera() {
      camera.position.set(
        cx + camDist * Math.cos(angle),
        camHeight,
        cz + camDist * Math.sin(angle),
      );
      camera.lookAt(cx, 40, cz);
    }
    updateCamera();

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // fully transparent — backdrop reads through
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.95);
    dl.position.set(420, 950, 320);
    scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0xf0997b, 0.22);
    dl2.position.set(-340, 540, -260);
    scene.add(dl2);

    const C = {
      squash: 0xf0997b, badminton: 0xc0dd97, cricket: 0xf5c4b3,
      fitness: 0xd3d1c7, locker: 0xb4b2a9,
      wallOuter: 0x4d5566, glass: 0xa8c4e0, tin: 0xd85a30, line: 0xffffff,
      netPost: 0x2a3142, netMesh: 0xeeeeee,
      doorFrame: 0x2a3142, doorGlass: 0x6a8aa8, handle: 0xc7cdd6,
      slopeEdge: 0x3a4252,
      bdLine: 0x27500a,
      stump: 0x5a3a1f,
    };

    // Track every mesh so we can dispose all geometries / materials on unmount.
    const meshes: THREE.Mesh[] = [];
    const lines: THREE.Line[] = [];

    function addZoneFloor(x: number, z: number, w: number, d: number, color: number) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshLambertMaterial({ color }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(x + w / 2, 0.5, z + d / 2);
      scene.add(m);
      meshes.push(m);
    }
    addZoneFloor(0,   0,   306, 202, C.badminton);
    addZoneFloor(306, 0,   266, 202, C.squash);
    addZoneFloor(0,   202, 306, 190, C.cricket);
    addZoneFloor(306, 202, 150, 190, C.fitness);
    addZoneFloor(456, 202, 116, 190, C.locker);

    function addWall(x: number, z: number, w: number, d: number, h: number, color?: number) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ color: color ?? C.wallOuter }),
      );
      m.position.set(x + w / 2, h / 2, z + d / 2);
      scene.add(m);
      meshes.push(m);
    }
    const WT = 3;
    const OUTER_H = 78;
    addWall(0, 0, BW, WT, OUTER_H);
    addWall(0, BD - WT, BW, WT, OUTER_H);
    addWall(0, 0, WT, BD, OUTER_H);
    addWall(BW - WT, 0, WT, BD, OUTER_H);
    addWall(489, 267, 50, 60, 24);
    addWall(439, 267, 50, 60, 24);
    addWall(389, 267, 50, 60, 24);

    function addStripe(x: number, z: number, w: number, d: number, color: number) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshBasicMaterial({ color }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(x + w / 2, 1.2, z + d / 2);
      scene.add(m);
      meshes.push(m);
    }

    // ── SQUASH ── 3 courts, right-hand zone (x 306..572), centred in the bay
    const SQ_X = [322, 398, 474];
    const COURT_FRONT_Z = 34;
    const COURT_BACK_Z = 154;
    const COURT_DEPTH = 120;
    const SIDE_FRONT_H = 78;
    const SIDE_BACK_H = 36;
    const FRONT_GLASS_H = 78;
    const BACK_GLASS_H = 36;
    const DOOR_H = 28;
    const DOOR_W = 16;
    const FRAME_T = 0.7;

    function addSlantedSide(xWall: number) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(COURT_DEPTH, 0);
      shape.lineTo(COURT_DEPTH, SIDE_BACK_H);
      shape.lineTo(0, SIDE_FRONT_H);
      shape.closePath();
      const geom = new THREE.ExtrudeGeometry(shape, { depth: WT, bevelEnabled: false });
      geom.rotateY(-Math.PI / 2);
      const mat = new THREE.MeshLambertMaterial({
        color: C.glass, transparent: true, opacity: 0.32, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(xWall + WT, 0, COURT_FRONT_Z);
      scene.add(mesh);
      meshes.push(mesh);
      const pts = [
        new THREE.Vector3(xWall + WT / 2, SIDE_FRONT_H, COURT_FRONT_Z),
        new THREE.Vector3(xWall + WT / 2, SIDE_BACK_H, COURT_BACK_Z),
      ];
      const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ color: C.slopeEdge }));
      scene.add(line);
      lines.push(line);
    }
    // One side wall per court plus a closing wall on the right, derived from
    // SQ_X so the two can't drift apart when the court count changes.
    [...SQ_X, SQ_X[SQ_X.length - 1] + 76].forEach(addSlantedSide);

    SQ_X.forEach((x) => {
      addStripe(x + 1, 34, 72, 1.5, C.line);
      addStripe(x + 1, 153, 72, 1.5, C.line);
      addStripe(x + 1, 34, 1.5, 120, C.line);
      addStripe(x + 72, 34, 1.5, 120, C.line);
      addStripe(x + 1, 36, 72, 4, C.tin);
      addStripe(x + 1, 101, 72, 1.5, C.line);
      addStripe(x + 36, 101, 1.5, 53, C.line);
      addStripe(x + 1, 118, 18, 1.5, C.line);
      addStripe(x + 18, 101, 1.5, 17, C.line);
      addStripe(x + 55, 118, 18, 1.5, C.line);
      addStripe(x + 55, 101, 1.5, 17, C.line);

      const frontG = new THREE.Mesh(
        new THREE.BoxGeometry(72, FRONT_GLASS_H, WT),
        new THREE.MeshLambertMaterial({ color: C.glass, transparent: true, opacity: 0.45 }),
      );
      frontG.position.set(x + 37, FRONT_GLASS_H / 2, COURT_FRONT_Z + WT / 2);
      scene.add(frontG); meshes.push(frontG);
      const frontRail = new THREE.Mesh(
        new THREE.BoxGeometry(72, FRAME_T * 1.2, WT + 0.3),
        new THREE.MeshLambertMaterial({ color: C.doorFrame }),
      );
      frontRail.position.set(x + 37, FRONT_GLASS_H + FRAME_T / 2, COURT_FRONT_Z + WT / 2);
      scene.add(frontRail); meshes.push(frontRail);

      const leftG = new THREE.Mesh(
        new THREE.BoxGeometry(28, BACK_GLASS_H, WT),
        new THREE.MeshLambertMaterial({ color: C.glass, transparent: true, opacity: 0.45 }),
      );
      leftG.position.set(x + 15, BACK_GLASS_H / 2, COURT_BACK_Z);
      scene.add(leftG); meshes.push(leftG);
      const rightG = new THREE.Mesh(
        new THREE.BoxGeometry(28, BACK_GLASS_H, WT),
        new THREE.MeshLambertMaterial({ color: C.glass, transparent: true, opacity: 0.45 }),
      );
      rightG.position.set(x + 59, BACK_GLASS_H / 2, COURT_BACK_Z);
      scene.add(rightG); meshes.push(rightG);
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(DOOR_W, DOOR_H, WT),
        new THREE.MeshLambertMaterial({ color: C.doorGlass, transparent: true, opacity: 0.62 }),
      );
      door.position.set(x + 37, DOOR_H / 2, COURT_BACK_Z);
      scene.add(door); meshes.push(door);
      const doorTop = new THREE.Mesh(
        new THREE.BoxGeometry(DOOR_W + 0.6, FRAME_T, WT + 0.4),
        new THREE.MeshLambertMaterial({ color: C.doorFrame }),
      );
      doorTop.position.set(x + 37, DOOR_H - FRAME_T / 2, COURT_BACK_Z);
      scene.add(doorTop); meshes.push(doorTop);
      const doorLeft = new THREE.Mesh(
        new THREE.BoxGeometry(FRAME_T, DOOR_H, WT + 0.4),
        new THREE.MeshLambertMaterial({ color: C.doorFrame }),
      );
      doorLeft.position.set(x + 37 - DOOR_W / 2, DOOR_H / 2, COURT_BACK_Z);
      scene.add(doorLeft); meshes.push(doorLeft);
      const doorRight = new THREE.Mesh(
        new THREE.BoxGeometry(FRAME_T, DOOR_H, WT + 0.4),
        new THREE.MeshLambertMaterial({ color: C.doorFrame }),
      );
      doorRight.position.set(x + 37 + DOOR_W / 2, DOOR_H / 2, COURT_BACK_Z);
      scene.add(doorRight); meshes.push(doorRight);
      const handle = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 10, 10),
        new THREE.MeshLambertMaterial({ color: C.handle }),
      );
      handle.position.set(x + 37 + DOOR_W / 2 - 3.5, DOOR_H / 2 - 1, COURT_BACK_Z + WT / 2 + 0.7);
      scene.add(handle); meshes.push(handle);
      const topRail = new THREE.Mesh(
        new THREE.BoxGeometry(72, FRAME_T * 1.2, WT + 0.3),
        new THREE.MeshLambertMaterial({ color: C.doorFrame }),
      );
      topRail.position.set(x + 37, BACK_GLASS_H + FRAME_T / 2, COURT_BACK_Z);
      scene.add(topRail); meshes.push(topRail);
    });

    // ── BADMINTON ── 4 courts, left-hand zone (x 0..306). Dark green lines,
    // complete doubles markings, 3D nets.
    const BD_X = [10, 84, 158, 232];
    BD_X.forEach((bx) => {
      addStripe(bx, 32, 64, 2.0, C.bdLine);
      addStripe(bx, 180, 64, 2.0, C.bdLine);
      addStripe(bx, 32, 2.0, 150, C.bdLine);
      addStripe(bx + 62, 32, 2.0, 150, C.bdLine);
      addStripe(bx + 5, 32, 1.4, 150, C.bdLine);
      addStripe(bx + 57.6, 32, 1.4, 150, C.bdLine);
      addStripe(bx, 85, 64, 1.6, C.bdLine);
      addStripe(bx, 129, 64, 1.6, C.bdLine);
      addStripe(bx, 40, 64, 1.4, C.bdLine);
      addStripe(bx, 174, 64, 1.4, C.bdLine);
      addStripe(bx + 32, 40, 1.4, 45, C.bdLine);
      addStripe(bx + 32, 129, 1.4, 45, C.bdLine);
      const postH = 18;
      [bx + 4, bx + 58].forEach((px) => {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(2, postH, 2),
          new THREE.MeshLambertMaterial({ color: C.netPost }),
        );
        post.position.set(px, postH / 2, 107);
        scene.add(post); meshes.push(post);
      });
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(54, 12, 0.4),
        new THREE.MeshLambertMaterial({ color: C.netMesh, transparent: true, opacity: 0.55 }),
      );
      mesh.position.set(bx + 32, 8, 107);
      scene.add(mesh); meshes.push(mesh);
      const tape = new THREE.Mesh(
        new THREE.BoxGeometry(54, 1.2, 0.6),
        new THREE.MeshBasicMaterial({ color: C.line }),
      );
      tape.position.set(bx + 32, 14, 107);
      scene.add(tape); meshes.push(tape);
    });

    // ── CRICKET ── lane outlines + pitch + creases + 3D wickets (stumps + bails)
    const stumpMat = new THREE.MeshLambertMaterial({ color: C.stump });
    function addWicketSet(x: number, zCenter: number) {
      const stumpH = 8, stumpW = 1.0, stumpSpacing = 2.2;
      for (let i = -1; i <= 1; i++) {
        const stump = new THREE.Mesh(
          new THREE.BoxGeometry(stumpW, stumpH, stumpW),
          stumpMat,
        );
        stump.position.set(x, stumpH / 2, zCenter + i * stumpSpacing);
        scene.add(stump); meshes.push(stump);
      }
      const bailLen = stumpSpacing * 0.95, bailH = 0.7, bailW = 0.8;
      for (let i = 0; i < 2; i++) {
        const bail = new THREE.Mesh(
          new THREE.BoxGeometry(bailW, bailH, bailLen),
          stumpMat,
        );
        bail.position.set(x, stumpH + bailH / 2, zCenter + (i - 0.5) * stumpSpacing);
        scene.add(bail); meshes.push(bail);
      }
    }

    // Lane width drives the matting, creases and wicket line together — they
    // used to be seven independent literals that could silently desync.
    const LANE_W = 64;
    const PITCH_W = LANE_W * 0.4;      // matting strip
    const CREASE_L = LANE_W * 0.667;   // crease line length
    // Both lanes sit high in the 202..392 zone: past z ~330 the 78-tall front
    // wall occludes the floor at the hero camera angle, and with only two
    // lanes, losing one behind the wall reads as a single lane.
    [214, 290].forEach((lz) => {
      addStripe(8, lz, 290, 1.2, 0xc9876a);
      addStripe(8, lz + LANE_W - 1, 290, 1.2, 0xc9876a);
      addStripe(8, lz, 1.2, LANE_W, 0xc9876a);
      addStripe(297, lz, 1.2, LANE_W, 0xc9876a);
      addStripe(24, lz + (LANE_W - PITCH_W) / 2, 162, PITCH_W, C.tin);
      addStripe(40, lz + (LANE_W - CREASE_L) / 2, 1.6, CREASE_L, C.line);
      addStripe(184, lz + (LANE_W - CREASE_L) / 2, 1.6, CREASE_L, C.line);
      const pitchZ = lz + LANE_W / 2;
      addWicketSet(40, pitchZ);
      addWicketSet(184, pitchZ);
    });

    // ── Animation ── pause when off-screen via IntersectionObserver
    let rafId = 0;
    let visible = true;
    function animate() {
      rafId = requestAnimationFrame(animate);
      if (!visible) return;
      angle += 0.0033;
      updateCamera();
      renderer.render(scene, camera);
    }
    animate();

    const observer = new IntersectionObserver(
      (entries) => { visible = entries[0]?.isIntersecting ?? true; },
      { threshold: 0.05 },
    );
    observer.observe(container);

    function onResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      meshes.forEach((m) => {
        m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat.dispose();
      });
      lines.forEach((l) => {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      });
      stumpMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-label="Rotating three dimensional rendering of the Exton Sports Center facility"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
