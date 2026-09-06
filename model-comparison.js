const modelComparisons = document.querySelectorAll("[data-three-model-comparison]");

if (modelComparisons.length) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const threeUrl = "./assets/vendor/three.module.min.js";

  if (!reducedMotion.matches) {
    import(threeUrl)
      .then((THREE) => {
        modelComparisons.forEach((section) => {
          if (section.classList.contains("is-three-unavailable")) return;
          setupModelComparison(section, THREE);
        });
      })
      .catch(() => {
        modelComparisons.forEach(markModelUnavailable);
      });
  }
}

const markModelUnavailable = (section) => {
  section.classList.remove("is-three-ready");
  section.classList.add("is-three-unavailable");
  delete section.dataset.modelParts;
  section.style.setProperty("--comparison-mask-start", "100%");
  section.style.setProperty("--comparison-mask-reveal", "100%");
  section.style.setProperty("--comparison-mask-solid", "100%");
  section.style.setProperty("--comparison-blend-opacity", "0");
  section.style.setProperty("--comparison-render-opacity", "0");
  section.style.setProperty("--comparison-photo-opacity", "1");
  section.style.setProperty("--comparison-render-copy-opacity", "0");
  section.style.setProperty("--comparison-photo-copy-opacity", "1");
  section.style.setProperty("--comparison-cue-opacity", "1");
  section.style.setProperty("--model-background-opacity", "0");
  section.style.setProperty("--model-layer-opacity", "0");
  window.dispatchEvent(new CustomEvent("modelcomparisonfallback"));
};

const setupModelComparison = (section, THREE) => {
  const stage = section.querySelector(".comparison-hook__stage");
  const canvasLayer = section.querySelector("[data-three-model-stage]");

  if (!(stage instanceof HTMLElement) || !(canvasLayer instanceof HTMLElement)) return;

  const modelSrc = canvasLayer.dataset.modelJsonSrc;
  if (!modelSrc) return;

  const scene = new THREE.Scene();
  const cameraStartPosition = new THREE.Vector3(5.2, 3.6, 5.2);
  const cameraBulbSidePosition = new THREE.Vector3(-1.35, 3.8, 5.8);
  const cameraEndPosition = new THREE.Vector3(-5.35, 3.35, -5.35);
  const cameraLookTarget = new THREE.Vector3(0, 0, 0);
  const cameraPosition = new THREE.Vector3();

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -50, 50);
  camera.position.copy(cameraStartPosition);
  camera.lookAt(cameraLookTarget);
  camera.updateMatrixWorld();

  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    markModelUnavailable(section);
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.sortObjects = true;
  canvasLayer.append(renderer.domElement);

  const modelRoot = new THREE.Group();
  modelRoot.rotation.set(0, 0, 0);
  modelRoot.position.set(1.22, 0.62, 0);
  scene.add(modelRoot);

  const keyLight = new THREE.DirectionalLight(0xfff1d7, 0);
  keyLight.position.set(3.2, 4.8, 6);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x94a6bd, 0);
  fillLight.position.set(-4.5, 2.2, -2.5);
  scene.add(fillLight);

  const ambientLight = new THREE.HemisphereLight(0xfff2da, 0x101419, 0);
  scene.add(ambientLight);

  const primaryBulbLight = new THREE.PointLight(0xffc982, 3.2, 5.4, 2.1);
  scene.add(primaryBulbLight);

  const parts = [];
  let progressCache = -1;
  let isTicking = false;
  let isReady = false;
  let focusStart = new THREE.Vector3(0, 0, 0);
  let focusEnd = new THREE.Vector3(0, 0, 0);
  let zoomStart = 2.8;
  let zoomEnd = 5.2;
  let rotationStart = new THREE.Vector3(-0.08, -0.16, -0.2);
  let rotationEnd = new THREE.Vector3(-0.08, -0.12, -0.18);
  let primaryBulbPart = null;
  const baseRootPosition = new THREE.Vector3();
  const desiredFocusStart = new THREE.Vector2(-0.14, 0.04);
  const desiredFocusEnd = new THREE.Vector2(0.1, -0.02);
  const projectedFocus = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();
  const cameraUp = new THREE.Vector3();
  const modelWorldInverse = new THREE.Matrix4();
  const localCameraRight = new THREE.Vector3();
  const localCameraUp = new THREE.Vector3();
  const contextExitVector = new THREE.Vector3();
  const bulbDarkColor = new THREE.Color(0x3f3931);
  const bulbWarmColor = new THREE.Color(0xffe4b5);
  const bulbHotColor = new THREE.Color(0xfff1cf);
  const bulbColorScratch = new THREE.Color();

  const createGlowTexture = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, 256, 256);
    const gradient = context.createRadialGradient(128, 128, 2, 128, 128, 128);
    gradient.addColorStop(0, "rgba(255, 242, 211, 0.9)");
    gradient.addColorStop(0.16, "rgba(255, 220, 162, 0.5)");
    gradient.addColorStop(0.42, "rgba(255, 180, 90, 0.17)");
    gradient.addColorStop(0.72, "rgba(255, 150, 62, 0.045)");
    gradient.addColorStop(1, "rgba(255, 150, 62, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  const bulbGlowTexture = createGlowTexture();

  const clampProgress = (value) => Math.min(1, Math.max(0, value));

  const easeProgress = (value) => {
    return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
  };

  const getMaterialBounds = (objectData, materialName) => {
    if (!Array.isArray(objectData.groups) || !Array.isArray(objectData.indices) || !Array.isArray(objectData.positions)) return null;

    const bounds = new THREE.Box3();
    const point = new THREE.Vector3();
    let hasPoint = false;

    objectData.groups.forEach((group) => {
      if (group.material !== materialName) return;

      const end = Math.min(objectData.indices.length, group.start + group.count);
      for (let indexOffset = group.start; indexOffset < end; indexOffset += 1) {
        const vertexIndex = objectData.indices[indexOffset] * 3;
        point.set(
          objectData.positions[vertexIndex],
          objectData.positions[vertexIndex + 1],
          objectData.positions[vertexIndex + 2],
        );
        bounds.expandByPoint(point);
        hasPoint = true;
      }
    });

    return hasPoint ? bounds : null;
  };

  const resizeRenderer = () => {
    const width = canvasLayer.clientWidth || stage.clientWidth;
    const height = canvasLayer.clientHeight || stage.clientHeight;
    if (!width || !height) return;

    const aspect = width / height;
    const isPortrait = aspect < 0.82;
    const frustum = isPortrait ? 4.7 : 4.1;
    baseRootPosition.set(isPortrait ? 0 : -0.16, isPortrait ? 0.16 : 0.02, 0);
    desiredFocusStart.set(isPortrait ? 0 : -0.34, isPortrait ? 0.2 : 0.16);
    desiredFocusEnd.set(isPortrait ? 0 : 0.34, isPortrait ? 0.04 : -0.02);
    camera.left = -frustum * aspect;
    camera.right = frustum * aspect;
    camera.top = frustum;
    camera.bottom = -frustum;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    renderer.setSize(width, height, false);
  };

  const getProgress = () => {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const rect = section.getBoundingClientRect();
    const scrollableDistance = Math.max(1, section.offsetHeight - viewportHeight);
    return clampProgress(-rect.top / scrollableDistance);
  };

  const updateModel = () => {
    isTicking = false;
    if (!isReady) return;

    const rawProgress = getProgress();
    const progress = easeProgress(rawProgress);
    const progressKey = Math.round(progress * 1000);
    if (progressKey === progressCache) return;
    progressCache = progressKey;

    const bulbLightProgress = easeProgress(clampProgress(rawProgress / 0.2));
    const focusProgress = easeProgress(clampProgress((rawProgress - 0.22) / 0.24));
    const ambienceProgress = easeProgress(clampProgress((rawProgress - 0.34) / 0.22));
    const explodeProgress = clampProgress((rawProgress - 0.58) / 0.28);
    const easedExplode = easeProgress(explodeProgress);
    const focusTargetProgress = easeProgress(clampProgress((rawProgress - 0.23) / 0.25));
    const cameraRouteProgress = easeProgress(clampProgress((rawProgress - 0.24) / 0.25));
    const focusTarget = focusStart.clone().lerp(focusEnd, focusTargetProgress);
    const desiredFocus = desiredFocusStart.clone().lerp(desiredFocusEnd, focusTargetProgress);
    const inverseFocusTargetProgress = 1 - focusTargetProgress;
    const zoomMid = 3.85;
    const zoom =
      zoomStart * inverseFocusTargetProgress * inverseFocusTargetProgress +
      zoomMid * 2 * inverseFocusTargetProgress * focusTargetProgress +
      zoomEnd * focusTargetProgress * focusTargetProgress;
    const rotation = rotationStart.clone().lerp(rotationEnd, focusProgress);

    const inverseFocusProgress = 1 - cameraRouteProgress;
    cameraPosition
      .copy(cameraStartPosition)
      .multiplyScalar(inverseFocusProgress * inverseFocusProgress)
      .addScaledVector(cameraBulbSidePosition, 2 * inverseFocusProgress * cameraRouteProgress)
      .addScaledVector(cameraEndPosition, cameraRouteProgress * cameraRouteProgress);
    camera.position.copy(cameraPosition);
    camera.lookAt(cameraLookTarget);
    camera.updateMatrixWorld();

    modelRoot.rotation.set(
      rotation.x + easedExplode * 0.02,
      rotation.y + easedExplode * 0.04,
      rotation.z,
    );
    modelRoot.scale.setScalar(zoom);
    modelRoot.position.copy(baseRootPosition);
    modelRoot.updateMatrixWorld(true);

    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    cameraUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    modelWorldInverse.copy(modelRoot.matrixWorld).invert();
    localCameraRight.copy(cameraRight).transformDirection(modelWorldInverse).normalize();
    localCameraUp.copy(cameraUp).transformDirection(modelWorldInverse).normalize();
    contextExitVector.copy(localCameraUp).addScaledVector(localCameraRight, -0.34).normalize();
    projectedFocus.copy(focusTarget).applyMatrix4(modelRoot.matrixWorld).project(camera);
    modelRoot.position.addScaledVector(cameraRight, (desiredFocus.x - projectedFocus.x) * ((camera.right - camera.left) / 2));
    modelRoot.position.addScaledVector(cameraUp, (desiredFocus.y - projectedFocus.y) * ((camera.top - camera.bottom) / 2));
    modelRoot.updateMatrixWorld(true);

    keyLight.intensity = ambienceProgress * 1.85;
    fillLight.intensity = ambienceProgress * 0.72;
    ambientLight.intensity = ambienceProgress * 0.36;
    if (primaryBulbPart) {
      primaryBulbLight.position
        .copy(primaryBulbPart.basePosition)
        .add(primaryBulbPart.bulbLightOffset || new THREE.Vector3())
        .applyMatrix4(modelRoot.matrixWorld);
      primaryBulbLight.intensity = 3.2 * (1 - bulbLightProgress);
    }

    parts.forEach((part) => {
      const stagger = clampProgress((easedExplode - part.delay) / 0.72);
      const easedStagger = easeProgress(stagger);
      const contextExitProgress = part.role === "context" ? easeProgress(clampProgress((rawProgress - 0.3) / 0.28)) : 0;
      const hasEntered =
        part.role === "bulb"
          ? rawProgress < 0.54
          : part.role === "dimmer"
            ? rawProgress > 0.26
            : part.role === "context"
              ? contextExitProgress < 0.995
              : explodeProgress > 0.02;
      part.mesh.position
        .copy(part.basePosition)
        .addScaledVector(contextExitVector, contextExitProgress * part.exitDistance)
        .addScaledVector(part.direction, easedStagger * part.distance);
      part.mesh.rotation.set(
        part.baseRotation.x + easedStagger * part.spin.x,
        part.baseRotation.y + easedStagger * part.spin.y,
        part.baseRotation.z + easedStagger * part.spin.z,
      );
      part.mesh.scale.setScalar(1 - easedStagger * 0.08);
      part.mesh.visible = hasEntered && easedStagger < 0.995;
      if (part.glow) {
        const isPrimaryBulb = part === primaryBulbPart;
        const primaryBoost = isPrimaryBulb ? 1 - bulbLightProgress : 0;
        const glowStrength = isPrimaryBulb ? 1 : bulbLightProgress;
        const glowScale = part.glowBaseScale * (1 + bulbLightProgress * 0.28 + primaryBoost * 0.45);
        part.glow.material.opacity = (glowStrength * 0.18 + primaryBoost * 0.54) * (part.mesh.visible ? 1 : 0);
        part.glow.scale.setScalar(glowScale * (1 - easedStagger * 0.18));
      }
      part.materials.forEach((material) => {
        if (part.role === "bulb" && material.name === "Mat17") {
          const isPrimaryBulb = part === primaryBulbPart;
          const primaryBoost = isPrimaryBulb ? 1 - bulbLightProgress : 0;
          const litAmount = isPrimaryBulb ? 1 : bulbLightProgress;
          bulbColorScratch.copy(bulbDarkColor).lerp(bulbWarmColor, litAmount);
          if (primaryBoost > 0) {
            bulbColorScratch.lerp(bulbHotColor, primaryBoost * 0.62);
          }
          material.color.copy(bulbColorScratch);
          if (material.emissive) {
            material.emissive.set(0xffd39a);
            material.emissiveIntensity = 0.03 + bulbLightProgress * 2.65 + primaryBoost * 1.72;
          }
          material.toneMapped = false;
        }
        if (material.transparent || material.opacity !== 1 || !material.depthWrite) {
          material.opacity = 1;
          material.transparent = false;
          material.depthWrite = true;
          material.needsUpdate = true;
        }
      });
    });

    renderer.render(scene, camera);
  };

  const requestUpdate = () => {
    if (isTicking) return;
    isTicking = true;
    window.requestAnimationFrame(updateModel);
  };

  const createMaterial = (hex, materialName) => {
    const color = new THREE.Color(hex || "#aaaaaa");
    const isSignalColor = materialName === "Mat1" || materialName === "Mat4";
    const isGlow = materialName === "Mat12" || materialName === "Mat13";
    const isBulbGlass = materialName === "Mat17";

    if (isBulbGlass) {
      return new THREE.MeshBasicMaterial({
        color: bulbDarkColor,
        side: THREE.DoubleSide,
        transparent: false,
        opacity: 1,
        depthWrite: true,
        depthTest: true,
        toneMapped: false,
      });
    }

    return new THREE.MeshStandardMaterial({
      color,
      emissive: isSignalColor || isGlow ? color : new THREE.Color(0x000000),
      emissiveIntensity: isGlow ? 0.32 : isSignalColor ? 0.12 : 0,
      metalness: materialName === "Mat3" || materialName === "Mat5" || materialName === "Mat9" ? 0.18 : 0.04,
      roughness: 0.62,
      side: THREE.DoubleSide,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      depthTest: true,
    });
  };

  const buildModel = (modelData) => {
    const materialCache = new Map();
    const getMaterial = (materialName) => {
      if (!materialCache.has(materialName)) {
        materialCache.set(materialName, createMaterial(modelData.materials?.[materialName], materialName));
      }
      return materialCache.get(materialName);
    };

    modelData.objects.forEach((objectData, objectIndex) => {
      if (!objectData.positions?.length || !objectData.indices?.length) return;

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(objectData.positions, 3));
      geometry.setIndex(objectData.indices);

      const objectMaterials = [];
      objectData.groups?.forEach((group) => {
        const materialName = group.material || "Mat9";
        let materialIndex = objectMaterials.findIndex((material) => material.name === materialName);
        if (materialIndex === -1) {
          const material = getMaterial(materialName).clone();
          material.name = materialName;
          objectMaterials.push(material);
          materialIndex = objectMaterials.length - 1;
        }
        geometry.addGroup(group.start, group.count, materialIndex);
      });

      geometry.computeVertexNormals();
      geometry.computeBoundingBox();

      const center = new THREE.Vector3();
      const originalBounds = geometry.boundingBox?.clone();
      const bulbGlassBounds = objectData.role === "bulb" ? getMaterialBounds(objectData, "Mat17") : null;
      geometry.boundingBox?.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);

      const mesh = new THREE.Mesh(geometry, objectMaterials.length ? objectMaterials : [getMaterial("Mat9").clone()]);
      mesh.position.copy(center);
      let glow = null;
      let glowBaseScale = 0;
      let bulbLightOffset = null;

      if (objectData.role === "bulb" && originalBounds) {
        const glowBounds = bulbGlassBounds || originalBounds;
        const glowCenter = new THREE.Vector3();
        const glowSize = new THREE.Vector3();
        glowBounds.getCenter(glowCenter);
        glowBounds.getSize(glowSize);
        glowBaseScale = Math.max(glowSize.x, glowSize.y, glowSize.z) * 4.8;
        bulbLightOffset = glowCenter.clone().sub(center);

        glow = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: bulbGlowTexture,
            color: 0xffdca8,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            depthTest: false,
            blending: THREE.NormalBlending,
            toneMapped: false,
          }),
        );
        glow.position.copy(bulbLightOffset);
        glow.scale.setScalar(glowBaseScale);
        mesh.add(glow);
      }

      const angle = objectIndex * 2.399963;
      const direction = center.clone().multiplyScalar(0.72);
      direction.x += Math.cos(angle) * 0.82;
      direction.y += Math.sin(angle * 0.73) * 0.5 + 0.42;
      direction.z += Math.sin(angle) * 0.82;
      if (direction.lengthSq() < 0.01) direction.set(0.7, 0.55, 0.35);
      direction.normalize();

      modelRoot.add(mesh);
      parts.push({
        mesh,
        materials: Array.isArray(mesh.material) ? mesh.material : [mesh.material],
        role: objectData.role || "model",
        glow,
        glowBaseScale,
        bulbLightOffset,
        basePosition: mesh.position.clone(),
        baseRotation: mesh.rotation.clone(),
        direction,
        distance:
          (objectData.role === "dimmer" ? 10.2 : objectData.role === "context" ? 11.2 : objectData.role === "support" ? 9.2 : 8.6) +
          (objectIndex % 11) * 0.54,
        exitDistance: objectData.role === "context" ? 3.1 + (objectIndex % 5) * 0.22 : 0,
        delay: (objectIndex % 13) * 0.01,
        spin: new THREE.Vector3(
          ((objectIndex % 5) - 2) * 0.22,
          ((objectIndex % 7) - 3) * -0.18,
          ((objectIndex % 4) - 1.5) * 0.16,
        ),
      });
    });

    isReady = parts.length > 0;

    if (!isReady) {
      markModelUnavailable(section);
      return;
    }

    const readFocus = (value, fallback) => {
      return Array.isArray(value) && value.length >= 3
        ? new THREE.Vector3(value[0], value[1], value[2])
        : fallback.clone();
    };
    const readNumber = (value, fallback) => (Number.isFinite(value) ? value : fallback);

    focusStart = readFocus(modelData.focus?.start, parts[parts.length - 1]?.basePosition || new THREE.Vector3());
    focusEnd = readFocus(modelData.focus?.end, focusStart);
    primaryBulbPart =
      parts
        .filter((part) => part.role === "bulb")
        .sort((a, b) => a.basePosition.distanceToSquared(focusStart) - b.basePosition.distanceToSquared(focusStart))[0] || null;
    zoomStart = readNumber(modelData.view?.zoomStart, zoomStart);
    zoomEnd = readNumber(modelData.view?.zoomEnd, zoomEnd);
    rotationStart = readFocus(modelData.view?.rotationStart, rotationStart);
    rotationEnd = readFocus(modelData.view?.rotationEnd, rotationEnd);

    resizeRenderer();

    window.requestAnimationFrame(() => {
      updateModel();

      section.dataset.modelParts = String(parts.length);
      section.classList.remove("is-three-unavailable");
      section.classList.add("is-three-ready");
      window.dispatchEvent(new CustomEvent("modelcomparisonready"));
    });
  };

  resizeRenderer();

  fetch(modelSrc)
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to load model: ${response.status}`);
      return response.json();
    })
    .then(buildModel)
    .catch(() => {
      markModelUnavailable(section);
      renderer.dispose();
      renderer.domElement.remove();
    });

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", () => {
    resizeRenderer();
    requestUpdate();
  });
  window.addEventListener("orientationchange", () => {
    resizeRenderer();
    requestUpdate();
  });
};
