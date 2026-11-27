"use client";
// ANA: avatar VRM con animación procedural (sin clips externos).
// Reposo (respira, parpadea, mira al cliente), saludo, gestos al hablar,
// lip sync con visemas y entrada/salida caminando.
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin, VRMUtils, type VRMHumanBoneName } from "@pixiv/three-vrm";
import { fijar, useKiosko } from "@/lib/cliente/store";
import { boca } from "@/lib/cliente/boca";
import type { AnimAna } from "@/lib/cliente/tipos";

const URL_MODELO = process.env.NEXT_PUBLIC_AVATAR_URL ?? "/models/ana.vrm";
/** Mallas del modelo que no se muestran (nombres de nodo del VRM). */
const OCULTAR = (process.env.NEXT_PUBLIC_AVATAR_OCULTAR ?? "robo_arm").split(",").map((s) => s.trim());

const suave = (actual: number, objetivo: number, k: number, dt: number) => actual + (objetivo - actual) * (1 - Math.exp(-k * dt));
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

type Pose = Partial<Record<VRMHumanBoneName, [number, number, number]>>;

export function Avatar() {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const grupo = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const anim = useKiosko((e) => e.animAna);

  // estado mutable de la animación (no provoca renders)
  const st = useRef({
    t: 0,
    animDesde: 0,
    anim: "fuera" as AnimAna,
    parpadeo: 0,
    proximoParpadeo: 2,
    x: 0,
    rotY: 0,
    visemas: { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 } as Record<string, number>,
    pose: {} as Record<string, THREE.Euler>,
    alturaCabeza: 1.4,
    alturaTotal: 1.6,
    mitadAncho: 1,
  });

  // ---------- carga ----------
  useEffect(() => {
    let cancelado = false;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      URL_MODELO,
      (gltf) => {
        if (cancelado) return;
        const v: VRM = gltf.userData.vrm;
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);
        VRMUtils.rotateVRM0(v); // no hace nada en VRM 1.0; corrige modelos 0.x
        v.scene.traverse((o) => {
          // Seed-san trae un brazo robótico en la espalda: se oculta para un look de tienda
          if (OCULTAR.includes(o.name)) o.visible = false;
          o.frustumCulled = false;
          if ((o as THREE.Mesh).isMesh) o.castShadow = true;
        });
        const cabeza = v.humanoid.getNormalizedBoneNode("head");
        v.scene.updateMatrixWorld(true);
        if (cabeza) st.current.alturaCabeza = cabeza.getWorldPosition(new THREE.Vector3()).y;
        st.current.alturaTotal = new THREE.Box3().setFromObject(v.scene).max.y;
        setVrm(v);
        // en la bienvenida ANA ya está en escena, en reposo
        fijar((e) => ({ avatarListo: true, progresoCarga: 1, animAna: e.animAna === "fuera" ? "reposo" : e.animAna }));
      },
      (e) => {
        if (e.total) fijar({ progresoCarga: Math.min(0.99, e.loaded / e.total) });
      },
      (err) => {
        console.error("No se pudo cargar el avatar", err);
        fijar({ avatarListo: true, progresoCarga: 1 }); // el kiosko sigue funcionando sin 3D
      },
    );
    return () => {
      cancelado = true;
    };
  }, []);

  // ---------- encuadre de cámara según el tamaño del escenario ----------
  useEffect(() => {
    if (!vrm) return;
    const h = st.current.alturaCabeza;
    const cam = camera as THREE.PerspectiveCamera;
    const aspecto = size.width / size.height;
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    // arriba: la coronilla + aire para la cabecera; abajo: cintura si el escenario es ancho,
    // muslos si es estrecho (pantalla vertical completa)
    const abajo = aspecto > 1.1 ? h * 0.6 : aspecto > 0.7 ? h * 0.45 : h * 0.28;
    const arriba = st.current.alturaTotal + (aspecto > 1.1 ? 0.14 : 0.2);
    // abajo queda tapado por los subtítulos: se desplaza el encuadre
    let alto = arriba - abajo;
    let dist = alto / 2 / tan;
    const mediaAnchoNecesaria = 0.42;
    if (dist * tan * aspecto < mediaAnchoNecesaria) dist = mediaAnchoNecesaria / (tan * aspecto);
    alto = dist * tan * 2;
    const centroY = arriba - alto / 2;
    // escenario ancho (pantalla vertical tras empezar): ANA a la izquierda, subtítulos a la derecha
    const desplazX = aspecto > 1.1 ? dist * tan * aspecto * 0.42 : 0;
    cam.position.set(desplazX, centroY + 0.04, dist);
    cam.lookAt(desplazX, centroY, 0);
    cam.updateProjectionMatrix();
    st.current.mitadAncho = dist * tan * aspecto + desplazX;
    if (vrm.lookAt) {
      vrm.lookAt.target = cam;
    }
  }, [vrm, camera, size]);

  useEffect(() => {
    st.current.anim = anim;
    st.current.animDesde = st.current.t;
  }, [anim]);

  const huesos = useMemo(() => {
    if (!vrm) return null;
    const get = (n: VRMHumanBoneName) => vrm.humanoid.getNormalizedBoneNode(n);
    return {
      hips: get("hips"), spine: get("spine"), chest: get("chest"), upperChest: get("upperChest"), neck: get("neck"), head: get("head"),
      lUA: get("leftUpperArm"), rUA: get("rightUpperArm"), lLA: get("leftLowerArm"), rLA: get("rightLowerArm"),
      lH: get("leftHand"), rH: get("rightHand"),
      lUL: get("leftUpperLeg"), rUL: get("rightUpperLeg"), lLL: get("leftLowerLeg"), rLL: get("rightLowerLeg"),
      lF: get("leftFoot"), rF: get("rightFoot"),
    };
  }, [vrm]);

  // ---------- animación por fotograma ----------
  useFrame((_, delta) => {
    if (!vrm || !huesos || !grupo.current) return;
    const dt = Math.min(delta, 1 / 20);
    const s = st.current;
    s.t += dt;
    const t = s.t;
    const ta = t - s.animDesde; // tiempo dentro de la animación actual
    const fuera = s.mitadAncho + 0.7;

    // --- posición y rumbo (entrar / salir caminando) ---
    let caminando = 0; // 0..1 intensidad del ciclo de caminata
    let objetivoRot = 0;
    let visible = true;
    const DUR_ENTRAR = 1.5;
    const DUR_SALIR = 1.8;
    if (s.anim === "fuera") {
      visible = false;
      s.x = fuera;
    } else if (s.anim === "entrar") {
      const k = clamp01(ta / DUR_ENTRAR);
      s.x = fuera * (1 - easeInOut(k));
      caminando = k < 0.85 ? 1 : (1 - k) / 0.15;
      objetivoRot = k < 0.8 ? -Math.PI / 2 : 0; // camina hacia la izquierda y luego mira al cliente
    } else if (s.anim === "salir") {
      const k = clamp01((ta - 0.35) / DUR_SALIR);
      objetivoRot = Math.PI / 2; // se gira hacia su izquierda (derecha de pantalla)
      s.x = -fuera * 0 + fuera * easeInOut(k) * 1.05;
      caminando = ta > 0.25 ? 1 : 0;
      if (k >= 1) visible = false;
    } else {
      s.x = suave(s.x, 0, 6, dt);
    }
    grupo.current.visible = visible;
    s.rotY = suave(s.rotY, objetivoRot, 7, dt);
    grupo.current.position.x = s.x;
    grupo.current.rotation.y = s.rotY;

    // --- pose base: brazos abajo, relajada ---
    const hablando = boca.hablando;
    const respira = Math.sin(t * 1.6);
    const pose: Pose = {
      hips: [0, 0, 0],
      spine: [0.02 + respira * 0.012, Math.sin(t * 0.5) * 0.02, 0],
      chest: [respira * 0.018, 0, 0],
      neck: [0, 0, 0],
      head: [Math.sin(t * 0.7) * 0.03, Math.sin(t * 0.43) * 0.06, Math.sin(t * 0.31) * 0.025],
      leftUpperArm: [0.05, 0, -1.22 + respira * 0.015],
      rightUpperArm: [0.05, 0, 1.22 - respira * 0.015],
      leftLowerArm: [0, -0.25, -0.12],
      rightLowerArm: [0, 0.25, 0.12],
      leftHand: [0, 0, -0.1],
      rightHand: [0, 0, 0.1],
      leftUpperLeg: [0, 0, 0],
      rightUpperLeg: [0, 0, 0],
      leftLowerLeg: [0, 0, 0],
      rightLowerLeg: [0, 0, 0],
      leftFoot: [0, 0, 0],
      rightFoot: [0, 0, 0],
    };

    // gestos al hablar: asiente y mueve un poco la mano
    if (hablando && s.anim !== "saludar") {
      pose.head![0] += Math.sin(t * 5.2) * 0.035 + Math.sin(t * 2.3) * 0.02;
      pose.head![1] += Math.sin(t * 1.7) * 0.05;
      pose.leftUpperArm = [0.25 + Math.sin(t * 2.1) * 0.06, 0.15, -1.05];
      pose.leftLowerArm = [0, -1.1 + Math.sin(t * 3.1) * 0.15, -0.1];
      pose.leftHand = [0, 0, -0.25 + Math.sin(t * 2.7) * 0.1];
    }

    // saludo con la mano derecha
    if (s.anim === "saludar") {
      const sube = clamp01(ta / 0.45);
      const ola = Math.sin(ta * 9) * 0.32;
      const e = easeInOut(sube);
      pose.rightUpperArm = [0.05 * (1 - e) + -0.25 * e, -0.35 * e, 1.22 * (1 - e) + 0.15 * e];
      pose.rightLowerArm = [0, 0.25 * (1 - e) + 0.15 * e, 0.12 * (1 - e) + -1.9 * e + ola * e];
      pose.rightHand = [0, 0, 0.1 * (1 - e) + (-0.15 + ola * 0.5) * e];
      pose.head![2] += 0.08 * e;
      pose.spine![2] = -0.03 * e;
    }

    // ciclo de caminata
    if (caminando > 0) {
      const w = t * 7.5;
      const a = Math.sin(w) * 0.55 * caminando;
      pose.leftUpperLeg = [a, 0, 0];
      pose.rightUpperLeg = [-a, 0, 0];
      pose.leftLowerLeg = [Math.max(0, -Math.sin(w)) * 0.9 * caminando, 0, 0];
      pose.rightLowerLeg = [Math.max(0, Math.sin(w)) * 0.9 * caminando, 0, 0];
      pose.leftUpperArm = [-a * 0.6, 0, -1.25];
      pose.rightUpperArm = [a * 0.6, 0, 1.25];
      pose.hips = [0, Math.sin(w) * 0.06 * caminando, 0];
      pose.spine![1] -= Math.sin(w) * 0.05 * caminando;
    }

    // aplica la pose con suavizado (transiciones fluidas entre estados)
    const aplicar = (nodo: THREE.Object3D | null, nombre: VRMHumanBoneName) => {
      const p = pose[nombre];
      if (!nodo || !p) return;
      const k = caminando > 0 ? 20 : 9;
      nodo.rotation.x = suave(nodo.rotation.x, p[0], k, dt);
      nodo.rotation.y = suave(nodo.rotation.y, p[1], k, dt);
      nodo.rotation.z = suave(nodo.rotation.z, p[2], k, dt);
    };
    aplicar(huesos.hips, "hips");
    aplicar(huesos.spine, "spine");
    aplicar(huesos.chest, "chest");
    aplicar(huesos.neck, "neck");
    aplicar(huesos.head, "head");
    aplicar(huesos.lUA, "leftUpperArm");
    aplicar(huesos.rUA, "rightUpperArm");
    aplicar(huesos.lLA, "leftLowerArm");
    aplicar(huesos.rLA, "rightLowerArm");
    aplicar(huesos.lH, "leftHand");
    aplicar(huesos.rH, "rightHand");
    aplicar(huesos.lUL, "leftUpperLeg");
    aplicar(huesos.rUL, "rightUpperLeg");
    aplicar(huesos.lLL, "leftLowerLeg");
    aplicar(huesos.rLL, "rightLowerLeg");
    if (huesos.hips) {
      const base = (huesos.hips.userData.yReposo ??= huesos.hips.position.y) as number;
      const extra = caminando ? Math.abs(Math.sin(t * 7.5)) * 0.025 : respira * 0.003;
      huesos.hips.position.y = suave(huesos.hips.position.y, base + extra, 12, dt);
    }

    // --- cara: parpadeo, visemas y expresión ---
    const em = vrm.expressionManager;
    if (em) {
      if (t > s.proximoParpadeo) {
        s.parpadeo = 1;
        s.proximoParpadeo = t + 2 + Math.random() * 3.5;
        if (Math.random() < 0.15) s.proximoParpadeo = t + 0.35; // doble parpadeo ocasional
      }
      const fase = 1 - s.parpadeo;
      s.parpadeo = Math.max(0, s.parpadeo - dt / 0.16);
      em.setValue("blink", Math.sin(fase * Math.PI) * (s.parpadeo > 0 ? 1 : 0));

      for (const v of ["aa", "ih", "ou", "ee", "oh"] as const) {
        s.visemas[v] = suave(s.visemas[v], boca.visemas[v], 22, dt);
        em.setValue(v, s.visemas[v] * 0.85);
      }
      const alegre = s.anim === "saludar" ? 0.55 : hablando ? 0.22 : 0.32;
      em.setValue("happy", suave(em.getValue("happy") ?? 0, alegre, 3, dt));
    }

    vrm.update(dt);
  });

  if (!vrm) return null;
  return (
    <group ref={grupo}>
      <primitive object={vrm.scene} />
    </group>
  );
}
