import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const PALETTE = {
  paint: 0x3b4a1e,
  gold: 0xfdc34d,
  cream: 0xe4eac9,
  glass: 0x101715,
  tyre: 0x101111,
  rim: 0x9ca48b,
  chrome: 0xc1c5b5,
  grille: 0x171b18,
  unavailable: 0x777b70,
  unavailableRim: 0x969990,
};

function cacheKey(values) {
  return values.map((value) => Number(value).toFixed(3)).join(":");
}

function createShape(points) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return shape;
}

export function mountFleet3d(grid) {
  const records = Array.from(grid.querySelectorAll("[data-fleet-vehicle-stage]")).map((stage) => ({
    stage,
    card: stage.closest(".fleet-card"),
    type: stage.dataset.vehicleType || "saloon",
    label: stage.dataset.vehicleLabel || "Vehicle",
    available: stage.dataset.vehicleAvailable === "true",
    intersecting: false,
    ratio: 0,
    sceneData: null,
    hover: false,
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    manualYaw: 0,
    autoYaw: 0,
    tiltX: 0,
    tiltZ: 0,
  }));
  const geometryCache = new Map();
  const materialCache = new Map();
  const ownedTextures = [];
  let observer = null;
  let renderer = null;
  let activeRecord = null;
  let animationFrame = 0;
  let previousTime = 0;
  let disposed = false;
  let rendererFailed = false;
  const supportsHover = window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function geometry(key, factory) {
    if (!geometryCache.has(key)) geometryCache.set(key, factory());
    return geometryCache.get(key);
  }

  function box(width, height, depth) {
    const key = `box:${cacheKey([width, height, depth])}`;
    return geometry(key, () => new THREE.BoxGeometry(width, height, depth));
  }

  function roundedBox(width, height, depth, radius = 0.08) {
    const key = `rounded-box:${cacheKey([width, height, depth, radius])}`;
    return geometry(key, () => {
      const bevel = Math.min(0.02, width / 4, height / 4, depth / 4);
      const shape = new THREE.Shape();
      const halfWidth = width / 2 - bevel;
      const halfHeight = height / 2 - bevel;
      const corner = Math.max(0.001, Math.min(radius - bevel, halfWidth, halfHeight));
      shape.moveTo(-halfWidth + corner, -halfHeight);
      shape.lineTo(halfWidth - corner, -halfHeight);
      shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + corner);
      shape.lineTo(halfWidth, halfHeight - corner);
      shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - corner, halfHeight);
      shape.lineTo(-halfWidth + corner, halfHeight);
      shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - corner);
      shape.lineTo(-halfWidth, -halfHeight + corner);
      shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + corner, -halfHeight);
      const extrusionDepth = depth - bevel * 2;
      const body = new THREE.ExtrudeGeometry(shape, {
        depth: extrusionDepth,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: bevel,
        bevelThickness: bevel,
      });
      body.translate(0, 0, -extrusionDepth / 2);
      body.computeVertexNormals();
      return body;
    });
  }

  function paintMaterial(available, shade = "body") {
    const key = `${available ? "available" : "unavailable"}:${shade}`;
    if (materialCache.has(key)) return materialCache.get(key);
    let material;
    if (shade === "glass") {
      material = new THREE.MeshPhysicalMaterial({
        color: PALETTE.glass,
        roughness: 0.19,
        metalness: 0.18,
        clearcoat: 0.8,
      });
    } else if (shade === "tyre") {
      material = new THREE.MeshStandardMaterial({ color: PALETTE.tyre, roughness: 0.78 });
    } else if (shade === "rim") {
      material = new THREE.MeshStandardMaterial({
        color: available ? PALETTE.rim : PALETTE.unavailableRim,
        metalness: 0.82,
        roughness: 0.24,
      });
    } else if (shade === "gold") {
      material = new THREE.MeshStandardMaterial({
        color: available ? PALETTE.gold : PALETTE.unavailableRim,
        metalness: 0.64,
        roughness: 0.26,
      });
    } else if (shade === "chrome") {
      material = new THREE.MeshStandardMaterial({
        color: available ? PALETTE.chrome : PALETTE.unavailableRim,
        metalness: 0.78,
        roughness: 0.28,
      });
    } else if (shade === "grille") {
      material = new THREE.MeshStandardMaterial({
        color: PALETTE.grille,
        metalness: 0.25,
        roughness: 0.46,
      });
    } else if (shade === "headlight") {
      material = new THREE.MeshStandardMaterial({
        color: 0xfff0b5,
        emissive: available ? 0xffd568 : 0x77756b,
        emissiveIntensity: available ? 2.4 : 0.25,
        roughness: 0.2,
      });
    } else if (shade === "taillight") {
      material = new THREE.MeshStandardMaterial({
        color: 0xff342a,
        emissive: available ? 0xc71910 : 0x592a27,
        emissiveIntensity: available ? 1.8 : 0.2,
        roughness: 0.25,
      });
    } else {
      material = new THREE.MeshPhysicalMaterial({
        color: available ? PALETTE.paint : PALETTE.unavailable,
        metalness: 0.45,
        roughness: 0.23,
        clearcoat: 1,
        clearcoatRoughness: 0.14,
      });
    }
    materialCache.set(key, material);
    return material;
  }

  function addMesh(parent, meshGeometry, material, position, scale, rotation) {
    const mesh = new THREE.Mesh(meshGeometry, material);
    if (position) mesh.position.set(position[0], position[1], position[2]);
    if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
    if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    parent.add(mesh);
    return mesh;
  }

  function bodyGeometry(type) {
    const profiles = {
      saloon: [
        [-1.88, 0.28], [1.88, 0.28], [1.88, 0.62], [1.24, 0.72],
        [0.82, 1.22], [0.36, 1.36], [-0.62, 1.34], [-1.23, 0.76], [-1.88, 0.68],
      ],
      pickup: [
        [-1.9, 0.28], [1.9, 0.28], [1.9, 0.68], [0.88, 0.7],
        [0.56, 1.25], [0.22, 1.37], [-0.58, 1.34], [-1.2, 0.73], [-1.9, 0.68],
      ],
      suv: [
        [-2, 0.28], [2, 0.28], [2, 0.68], [1.28, 0.76],
        [0.98, 1.43], [0.66, 1.52], [-0.92, 1.5], [-1.42, 0.82], [-2, 0.68],
      ],
    };
    const points = profiles[type];
    const key = `body:${type}`;
    return geometry(key, () => {
      const shape = createShape(points);
      const body = new THREE.ExtrudeGeometry(shape, {
        depth: type === "suv" ? 1.9 : 1.72,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.045,
        bevelThickness: 0.045,
      });
      body.rotateY(Math.PI / 2);
      body.translate(type === "suv" ? -0.95 : -0.86, 0, 0);
      body.computeVertexNormals();
      return body;
    });
  }

  function addWheels(vehicle, record, positions) {
    const wheelGeometry = geometry("wheel-cylinder", () => new THREE.CylinderGeometry(0.34, 0.34, 0.27, 20, 1));
    const rimGeometry = geometry("wheel-rim", () => new THREE.CylinderGeometry(0.195, 0.195, 0.285, 16, 1));
    const rimRingGeometry = geometry("wheel-rim-ring", () => new THREE.TorusGeometry(0.25, 0.018, 6, 24));
    const spokeGeometry = box(0.028, 0.22, 0.032);
    const hubGeometry = geometry("wheel-hub", () => new THREE.CylinderGeometry(0.065, 0.065, 0.045, 12));
    const boltGeometry = geometry("wheel-bolt", () => new THREE.SphereGeometry(0.018, 8, 6));
    const wheels = [];
    positions.forEach(([x, z]) => {
      const wheel = new THREE.Group();
      wheel.position.set(x, 0.36, z);
      vehicle.add(wheel);
      const tyre = addMesh(wheel, wheelGeometry, paintMaterial(record.available, "tyre"), null, null, [0, 0, Math.PI / 2]);
      tyre.rotation.set(0, 0, Math.PI / 2);
      addMesh(wheel, rimGeometry, paintMaterial(record.available, "rim"), null, null, [0, 0, Math.PI / 2]);
      for (const side of [-1, 1]) {
        const face = new THREE.Group();
        face.position.x = side * 0.15;
        wheel.add(face);
        addMesh(face, rimRingGeometry, paintMaterial(record.available, "chrome"), null, null, [0, Math.PI / 2, 0]);
        for (let spoke = 0; spoke < 5; spoke += 1) {
          addMesh(
            face,
            spokeGeometry,
            paintMaterial(record.available, "rim"),
            [0, 0, 0],
            null,
            [spoke * Math.PI * 2 / 5, 0, 0]
          );
        }
        addMesh(face, hubGeometry, paintMaterial(record.available, "chrome"), [side * 0.012, 0, 0], null, [0, 0, Math.PI / 2]);
        for (let bolt = 0; bolt < 5; bolt += 1) {
          const angle = bolt * Math.PI * 2 / 5;
          addMesh(
            face,
            boltGeometry,
            paintMaterial(record.available, "chrome"),
            [side * 0.014, Math.cos(angle) * 0.135, Math.sin(angle) * 0.135]
          );
        }
      }
      wheels.push(wheel);
    });
    return wheels;
  }

  function addFrontGrille(vehicle, record, width, height, y, z) {
    const frame = paintMaterial(record.available, "chrome");
    const dark = paintMaterial(record.available, "grille");
    addMesh(vehicle, roundedBox(width, height, 0.035, 0.055), dark, [0, y, z]);
    for (const edge of [-1, 1]) {
      addMesh(vehicle, box(0.025, height, 0.022), frame, [edge * (width / 2 - 0.015), y, z + 0.022]);
      addMesh(vehicle, box(width, 0.022, 0.022), frame, [0, y + edge * (height / 2 - 0.012), z + 0.022]);
    }
    for (let line = -1; line <= 1; line += 1) {
      addMesh(vehicle, box(width * 0.82, 0.014, 0.018), frame, [0, y + line * height * 0.22, z + 0.027]);
    }
    const badge = geometry("grille-badge", () => new THREE.SphereGeometry(0.052, 12, 8));
    addMesh(vehicle, badge, paintMaterial(record.available, "gold"), [0, y, z + 0.04], [1, 1, 0.45]);
  }

  function addSideMirrors(vehicle, record, sideWidth, y, z) {
    const dark = paintMaterial(record.available, "grille");
    const body = paintMaterial(record.available);
    for (const side of [-1, 1]) {
      addMesh(vehicle, box(0.035, 0.045, 0.24), dark, [side * (sideWidth + 0.055), y - 0.045, z - 0.025]);
      addMesh(
        vehicle,
        roundedBox(0.16, 0.15, 0.22, 0.045),
        body,
        [side * (sideWidth + 0.12), y + 0.015, z + 0.015]
      );
      addMesh(
        vehicle,
        box(0.025, 0.105, 0.16),
        paintMaterial(record.available, "chrome"),
        [side * (sideWidth + 0.205), y + 0.015, z + 0.015]
      );
    }
  }

  function addDoorDetails(vehicle, record, sideWidth, positions) {
    const chrome = paintMaterial(record.available, "chrome");
    const seam = paintMaterial(record.available, "grille");
    for (const side of [-1, 1]) {
      addMesh(
        vehicle,
        box(0.016, 0.48, 0.018),
        seam,
        [side * (sideWidth + 0.01), 0.73, 0.02]
      );
    }
    positions.forEach((z) => {
      for (const side of [-1, 1]) {
        addMesh(vehicle, roundedBox(0.028, 0.035, 0.14, 0.012), chrome, [side * (sideWidth + 0.014), 0.94, z]);
      }
    });
  }

  function addPassengerBumper(vehicle, record) {
    addMesh(
      vehicle,
      roundedBox(1.42, 0.105, 0.1, 0.04),
      paintMaterial(record.available, "chrome"),
      [0, 0.43, 1.91]
    );
    const fogLight = paintMaterial(record.available, "headlight");
    for (const side of [-1, 1]) {
      addMesh(vehicle, box(0.12, 0.07, 0.045), fogLight, [side * 0.51, 0.52, 1.96]);
    }
  }

  function addSideWindows(vehicle, record, count, width, length, y, zStart, gap) {
    const pane = box(0.035, heightForWindows(record.type), width);
    const glass = paintMaterial(record.available, "glass");
    for (let side of [-1, 1]) {
      for (let index = 0; index < count; index += 1) {
        addMesh(vehicle, pane, glass, [side * (length / 2 + 0.012), y, zStart + index * gap]);
      }
    }
  }

  function heightForWindows(type) {
    return type === "suv" ? 0.43 : type === "bus" ? 0.62 : 0.38;
  }

  function createLetteringMaterial() {
    if (materialCache.has("truck-lettering")) return materialCache.get("truck-lettering");
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 512;
    textureCanvas.height = 128;
    const context = textureCanvas.getContext("2d");
    if (!context) throw new Error("Could not create the truck side lettering texture.");
    context.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
    context.fillStyle = "#fdc34d";
    context.font = "700 56px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("BEE CEE", 256, 64);
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    ownedTextures.push(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, side: THREE.DoubleSide });
    materialCache.set("truck-lettering", material);
    return material;
  }

  function makeTruckLettering(vehicle, material) {
    const plane = geometry("truck-letter-plane", () => new THREE.PlaneGeometry(1.62, 0.4));
    addMesh(vehicle, plane, material, [1.083, 1.17, -0.66], null, [0, Math.PI / 2, 0]);
    addMesh(vehicle, plane, material, [-1.083, 1.17, -0.66], null, [0, -Math.PI / 2, 0]);
  }

  function makeVehicle(record) {
    const scene = new THREE.Scene();
    const vehicle = new THREE.Group();
    const wheels = [];
    const body = paintMaterial(record.available);
    const glass = paintMaterial(record.available, "glass");
    const gold = paintMaterial(record.available, "gold");
    const black = paintMaterial(record.available, "tyre");
    const headlight = paintMaterial(record.available, "headlight");
    const taillight = paintMaterial(record.available, "taillight");

    scene.add(new THREE.AmbientLight(0xe4eac9, 1.45));
    const keyLight = new THREE.DirectionalLight(0xfff0d1, 3.1);
    keyLight.position.set(4, 7, 5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0xfdc34d, 15, 13);
    rimLight.position.set(-4, 3.4, -2.5);
    scene.add(rimLight);
    const frontLight = new THREE.PointLight(0xffe6a3, record.available ? 2.1 : 0.15, 3.3);
    frontLight.position.set(0, 0.95, 2.5);
    scene.add(frontLight);

    const shadowGeometry = geometry("contact-shadow", () => new THREE.CircleGeometry(1, 32));
    const shadowMaterialKey = record.available ? "shadow" : "shadow-unavailable";
    if (!materialCache.has(shadowMaterialKey)) {
      materialCache.set(shadowMaterialKey, new THREE.MeshBasicMaterial({
        color: 0x050806,
        transparent: true,
        opacity: record.available ? 0.36 : 0.3,
        depthWrite: false,
      }));
    }
    addMesh(scene, shadowGeometry, materialCache.get(shadowMaterialKey), [0, 0.025, 0], [1.65, 2.35, 1], [-Math.PI / 2, 0, 0]);

    if (record.type === "bus") {
      addMesh(vehicle, roundedBox(2.1, 1.62, 4.25, 0.2), body, [0, 1.05, 0]);
      addMesh(vehicle, box(2.06, 0.08, 3.9), gold, [0, 0.5, 0]);
      addMesh(vehicle, box(1.76, 0.78, 0.045), glass, [0, 1.35, 2.14]);
      addSideWindows(vehicle, record, 5, 0.52, 2.1, 1.36, -1.55, 0.62);
      addMesh(vehicle, box(0.055, 0.8, 0.055), black, [1.08, 1.3, 0.15]);
      wheels.push(...addWheels(vehicle, record, [[-0.88, 1.35], [0.88, 1.35], [-0.88, -1.42], [0.88, -1.42]]));
      addMesh(vehicle, box(0.38, 0.2, 0.08), headlight, [-0.65, 0.83, 2.15]);
      addMesh(vehicle, box(0.38, 0.2, 0.08), headlight, [0.65, 0.83, 2.15]);
      addMesh(vehicle, box(0.24, 0.28, 0.07), taillight, [-0.7, 0.82, -2.15]);
      addMesh(vehicle, box(0.24, 0.28, 0.07), taillight, [0.7, 0.82, -2.15]);
    } else if (record.type === "truck") {
      addMesh(vehicle, roundedBox(2.15, 1.72, 2.55, 0.14), body, [0, 1.16, -0.63]);
      addMesh(vehicle, roundedBox(1.82, 1.15, 1.0, 0.14), body, [0, 1.15, 1.03]);
      addMesh(vehicle, roundedBox(1.86, 0.36, 0.88, 0.12), body, [0, 1.87, 0.98]);
      addMesh(vehicle, box(1.58, 0.62, 0.045), glass, [0, 1.45, 1.55]);
      addMesh(vehicle, roundedBox(1.86, 0.46, 0.62, 0.1), body, [0, 0.64, 1.56]);
      addMesh(vehicle, box(0.04, 0.54, 2.3), gold, [1.09, 1.16, -0.63]);
      addMesh(vehicle, box(0.04, 0.54, 2.3), gold, [-1.09, 1.16, -0.63]);
      makeTruckLettering(vehicle, createLetteringMaterial());
      wheels.push(...addWheels(vehicle, record, [
        [-1.02, 1.1], [1.02, 1.1], [-1.02, -0.95], [1.02, -0.95], [-1.02, -1.55], [1.02, -1.55],
      ]));
      addMesh(vehicle, box(0.36, 0.2, 0.08), headlight, [-0.67, 0.73, 1.91]);
      addMesh(vehicle, box(0.36, 0.2, 0.08), headlight, [0.67, 0.73, 1.91]);
      addMesh(vehicle, box(0.22, 0.27, 0.07), taillight, [-0.8, 1.02, -1.94]);
      addMesh(vehicle, box(0.22, 0.27, 0.07), taillight, [0.8, 1.02, -1.94]);
    } else {
      addMesh(vehicle, bodyGeometry(record.type), body, [0, 0, 0]);
      if (record.type === "pickup") {
        addMesh(vehicle, box(1.68, 0.13, 1.25), black, [0, 0.72, -1.16]);
        addMesh(vehicle, box(0.08, 0.36, 1.3), body, [0.82, 0.9, -1.16]);
        addMesh(vehicle, box(0.08, 0.36, 1.3), body, [-0.82, 0.9, -1.16]);
        addMesh(vehicle, box(1.64, 0.34, 0.08), body, [0, 0.88, -1.78]);
      }
      const isSuv = record.type === "suv";
      const windowWidth = isSuv ? 1.44 : 1.18;
      const windowY = isSuv ? 1.2 : 1.08;
      addSideWindows(vehicle, record, 2, windowWidth / 2, isSuv ? 1.9 : 1.72, windowY, -0.5, 0.76);
      addMesh(vehicle, box(isSuv ? 1.48 : 1.24, 0.43, 0.045), glass, [0, windowY + 0.02, 0.88], null, [-0.32, 0, 0]);
      addMesh(vehicle, box(1.05, 0.34, 0.045), glass, [0, windowY, -0.83], null, [0.2, 0, 0]);
      addMesh(vehicle, box(1.45, 0.055, 2.65), gold, [0, 0.48, 0]);
      const wheelPositions = record.type === "pickup"
        ? [[-0.91, 1.25], [0.91, 1.25], [-0.91, -1.3], [0.91, -1.3]]
        : [[-0.91, 1.25], [0.91, 1.25], [-0.91, -1.25], [0.91, -1.25]];
      wheels.push(...addWheels(vehicle, record, wheelPositions));
      addMesh(vehicle, box(0.34, 0.18, 0.07), headlight, [-0.62, 0.72, 1.87]);
      addMesh(vehicle, box(0.34, 0.18, 0.07), headlight, [0.62, 0.72, 1.87]);
      addMesh(vehicle, box(0.2, 0.24, 0.07), taillight, [-0.67, 0.69, -1.87]);
      addMesh(vehicle, box(0.2, 0.24, 0.07), taillight, [0.67, 0.69, -1.87]);
    }

    if (record.type === "bus") {
      addFrontGrille(vehicle, record, 0.72, 0.2, 0.68, 2.17);
      addSideMirrors(vehicle, record, 1.05, 1.58, 1.78);
    } else if (record.type === "truck") {
      addFrontGrille(vehicle, record, 0.92, 0.3, 0.68, 1.9);
      addSideMirrors(vehicle, record, 0.91, 1.53, 1.52);
    } else {
      const sideWidth = record.type === "suv" ? 0.95 : 0.86;
      addFrontGrille(vehicle, record, 0.78, 0.24, 0.68, 1.91);
      addPassengerBumper(vehicle, record);
      addSideMirrors(vehicle, record, sideWidth, record.type === "suv" ? 1.49 : 1.37, 1.55);
      addDoorDetails(vehicle, record, sideWidth, record.type === "pickup" ? [0.28] : [0.28, -0.53]);
    }

    scene.add(vehicle);
    return { scene, vehicle, wheels };
  }

  function ensureRenderer() {
    if (renderer || rendererFailed) return Boolean(renderer);
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.className = "fleet-3d-canvas";
      renderer.domElement.setAttribute("role", "img");
      renderer.domElement.style.pointerEvents = "none";
      return true;
    } catch (error) {
      rendererFailed = true;
      console.warn("Could not create the fleet 3D renderer; keeping the static vehicle art.", error);
      return false;
    }
  }

  function revealStaticArt(record, visible) {
    const art = record.stage.querySelector(".fleet-vehicle-art");
    if (art) {
      if (visible) art.removeAttribute("hidden");
      else art.setAttribute("hidden", "");
      art.setAttribute("aria-hidden", String(!visible));
    }
    if (visible) record.stage.removeAttribute("data-3d-ready");
  }

  function chooseActive() {
    if (disposed || document.hidden) {
      setActive(null);
      return;
    }
    const candidates = records.filter((record) =>
      record.intersecting &&
      record.card &&
      !record.card.hidden &&
      record.stage.isConnected &&
      (!supportsHover || record.hover)
    );
    candidates.sort((a, b) => {
      if (a.hover !== b.hover) return a.hover ? -1 : 1;
      const aCenter = Math.abs(a.stage.getBoundingClientRect().top + a.stage.offsetHeight / 2 - window.innerHeight / 2);
      const bCenter = Math.abs(b.stage.getBoundingClientRect().top + b.stage.offsetHeight / 2 - window.innerHeight / 2);
      return aCenter - bCenter || b.ratio - a.ratio;
    });
    setActive(candidates[0] || null);
  }

  function resizeActive() {
    if (!activeRecord || !renderer) return;
    const rect = activeRecord.stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    activeRecord.sceneData.camera.aspect = rect.width / rect.height;
    activeRecord.sceneData.camera.updateProjectionMatrix();
  }

  function setActive(record) {
    if (record === activeRecord) return;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
    if (activeRecord) {
      revealStaticArt(activeRecord, true);
      if (renderer && renderer.domElement.parentNode === activeRecord.stage) {
        activeRecord.stage.removeChild(renderer.domElement);
      }
    }
    activeRecord = record;
    previousTime = 0;
    if (!record || !ensureRenderer()) return;

    try {
      if (!record.sceneData) {
        record.sceneData = makeVehicle(record);
        record.sceneData.camera = new THREE.PerspectiveCamera(31, 1, 0.1, 40);
        record.sceneData.camera.position.set(6.7, 4.2, 8.3);
        record.sceneData.camera.lookAt(0, 0.92, 0);
      }
      renderer.domElement.setAttribute("aria-label", record.label);
      record.stage.appendChild(renderer.domElement);
      resizeActive();
      draw(performance.now());
    } catch (error) {
      revealStaticArt(record, true);
      if (renderer.domElement.parentNode === record.stage) record.stage.removeChild(renderer.domElement);
      rendererFailed = true;
      console.warn("Could not render a fleet vehicle; keeping the static vehicle art.", error);
    }
  }

  function draw(time) {
    if (disposed || !activeRecord || !renderer || document.hidden) return;
    if (activeRecord.card.hidden || !activeRecord.stage.isConnected) {
      chooseActive();
      return;
    }
    const record = activeRecord;
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
    previousTime = time;
    const vehicle = record.sceneData.vehicle;
    if (record.available) {
      record.autoYaw += delta * 0.11;
      vehicle.rotation.y = record.autoYaw + record.manualYaw;
      vehicle.rotation.x += (record.tiltX - vehicle.rotation.x) * Math.min(delta * 5, 1);
      vehicle.rotation.z += (record.tiltZ - vehicle.rotation.z) * Math.min(delta * 5, 1);
      if (record.hover) record.sceneData.wheels.forEach((wheel) => { wheel.rotation.x += delta * 3.8; });
    }
    try {
      renderer.render(record.sceneData.scene, record.sceneData.camera);
      revealStaticArt(record, false);
      record.stage.setAttribute("data-3d-ready", "true");
    } catch (error) {
      revealStaticArt(record, true);
      rendererFailed = true;
      console.warn("Fleet 3D frame failed; keeping the static vehicle art.", error);
      setActive(null);
      return;
    }
    animationFrame = requestAnimationFrame(draw);
  }

  function bindInteraction(record) {
    const stage = record.stage;
    const handleEnter = (event) => {
      if (event.pointerType !== "mouse") return;
      record.hover = true;
      if (supportsHover) {
        record.intersecting = true;
        chooseActive();
      }
    };
    const handleLeave = (event) => {
      if (event.pointerType === "mouse" && !record.dragging) {
        record.hover = false;
        record.tiltX = 0;
        record.tiltZ = 0;
        if (supportsHover) chooseActive();
      }
    };
    const handleDown = (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      record.dragging = true;
      record.pointerId = event.pointerId;
      record.lastX = event.clientX;
      record.lastY = event.clientY;
      if (stage.setPointerCapture) stage.setPointerCapture(event.pointerId);
    };
    const handleMove = (event) => {
      if (event.pointerType === "mouse" && !record.dragging) {
        const bounds = stage.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5;
        const y = (event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5;
        record.tiltX = y * 0.15;
        record.tiltZ = -x * 0.09;
      }
      if (!record.dragging || record.pointerId !== event.pointerId) return;
      const dx = event.clientX - record.lastX;
      const dy = event.clientY - record.lastY;
      record.lastX = event.clientX;
      record.lastY = event.clientY;
      if (event.pointerType === "touch") {
        if (Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy)) record.manualYaw += dx * 0.012;
      } else {
        record.manualYaw += dx * 0.009;
        record.tiltX = Math.max(-0.2, Math.min(0.2, record.tiltX + dy * 0.002));
      }
    };
    const stopDrag = (event) => {
      if (record.pointerId !== event.pointerId) return;
      record.dragging = false;
      record.pointerId = null;
      if (event.pointerType === "mouse") {
        const bounds = stage.getBoundingClientRect();
        record.hover =
          event.clientX >= bounds.left &&
          event.clientX <= bounds.right &&
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom;
        if (!record.hover) {
          record.tiltX = 0;
          record.tiltZ = 0;
        }
        if (supportsHover) chooseActive();
      }
    };

    stage.addEventListener("pointerenter", handleEnter);
    stage.addEventListener("pointerleave", handleLeave);
    if (record.available) {
      stage.addEventListener("pointerdown", handleDown);
      stage.addEventListener("pointermove", handleMove);
      stage.addEventListener("pointerup", stopDrag);
      stage.addEventListener("pointercancel", stopDrag);
    }
    return () => {
      stage.removeEventListener("pointerenter", handleEnter);
      stage.removeEventListener("pointerleave", handleLeave);
      if (record.available) {
        stage.removeEventListener("pointerdown", handleDown);
        stage.removeEventListener("pointermove", handleMove);
        stage.removeEventListener("pointerup", stopDrag);
        stage.removeEventListener("pointercancel", stopDrag);
      }
    };
  }

  const interactionCleanups = records.map(bindInteraction);

  function handleVisibility() {
    if (document.hidden) setActive(null);
    else chooseActive();
  }

  function handleResize() {
    resizeActive();
  }

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("resize", handleResize);
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const record = records.find((item) => item.stage === entry.target);
      if (!record) return;
      record.intersecting = entry.isIntersecting;
      record.ratio = entry.intersectionRatio;
    });
    chooseActive();
  }, { rootMargin: "0px", threshold: [0, 0.15, 0.5] });
  records.forEach((record) => observer.observe(record.stage));

  return function cleanupFleet3d() {
    if (disposed) return;
    disposed = true;
    if (observer) observer.disconnect();
    if (animationFrame) cancelAnimationFrame(animationFrame);
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("resize", handleResize);
    interactionCleanups.forEach((cleanup) => cleanup());
    records.forEach((record) => {
      revealStaticArt(record, true);
      if (renderer && renderer.domElement.parentNode === record.stage) {
        record.stage.removeChild(renderer.domElement);
      }
    });
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
      renderer = null;
    }
    geometryCache.forEach((item) => item.dispose());
    materialCache.forEach((item) => item.dispose());
    ownedTextures.forEach((texture) => texture.dispose());
  };
}
