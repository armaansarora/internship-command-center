# Three.js / React Three Fiber / WebGL Research for "The Tower"

> **Research Date:** March 19, 2026  
> **Context:** Immersive, game-like web UI inside a Next.js 16 app — a skyscraper-themed SaaS where the user feels "inside" a luxury high-rise overlooking the NYC skyline. Photorealistic backgrounds, depth, parallax, atmospheric effects required.

---

## Table of Contents

1. [Three.js — Realistic 3D Backgrounds](#1-threejs--realistic-3d-backgrounds)
2. [React Three Fiber (R3F) — Next.js 16 Integration](#2-react-three-fiber-r3f--nextjs-16-integration)
3. [WebGL Shaders — Atmospheric Effects](#3-webgl-shaders--atmospheric-effects)
4. [Performance — FPS, Memory, Optimization](#4-performance--fps-memory-optimization)
5. [Production Website Examples](#5-production-website-examples-threejsr3f-behind-functional-ui)
6. [Technology Comparison Summary](#6-technology-comparison-summary)
7. [Recommendation for "The Tower"](#7-recommendation-for-the-tower)
8. [Sources](#8-sources)

---

## 1. Three.js — Realistic 3D Backgrounds

### Can Three.js Render a Realistic NYC Skyline?

**Yes, absolutely.** Three.js is the dominant library for 3D web graphics and supports multiple approaches for realistic city environments:

#### Approach A: HDRI Environment Map (Recommended for "The Tower")

The fastest path to a photorealistic NYC skyline is using an **equirectangular HDRI** (High Dynamic Range Image) as a scene background and environment map. This gives you:
- A 360° panoramic cityscape wrapping the entire viewport
- Realistic reflections on any glass/metallic surfaces in your scene
- Proper lighting derived from the environment itself (no manual light placement needed)

**How it works in Three.js:**
```javascript
// Using UltraHDRLoader (Three.js v165+) or RGBELoader
const loader = new RGBELoader();
loader.load('/nyc-skyline.hdr', (hdr) => {
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = hdr;
  scene.environment = hdr; // drives PBR lighting
});
```

**HDRI Sources for NYC skyline:**
- [CGI Backgrounds](https://www.cgibackgrounds.com/asset/manhattan-skyline-night-view) — Manhattan night skyline HDRIs specifically
- [Poly Haven](https://polyhaven.com/hdris/urban) — Free urban HDRIs (CC0 license)
- [HDRI Haven](https://hdrihaven.com) — Additional free options
- Custom: Commission a photographer for a rooftop 360° capture, or create in Blender/Unreal with NYC asset packs

The Three.js forum community confirms that **HDRI + PBR materials** is the standard technique for architectural-quality renders. For "inside a luxury high-rise looking out," you'd combine an HDRI background with modeled interior elements (window frames, floor, ceiling) using `MeshStandardMaterial` or `MeshPhysicalMaterial`. ([Three.js Forum — Realistic Ambience](https://discourse.threejs.org/t/achieving-realistic-ambience-in-architectural-three-js-scenes/89753))

#### Approach B: Skybox Cubemap

A classic six-face cubemap wrapping a cube. Lower quality than equirectangular HDRI but trivial to implement. Useful for stylized (non-photorealistic) looks.

#### Approach C: Procedural Sky + 3D City Model

Load a GLTF city model and use a procedural sky shader (Three.js includes one). Most complex but most flexible (camera can actually move through the city). Massive performance cost — not recommended for a background behind SaaS UI.

#### How Awwwards Winners & Bruno Simon Use Three.js

- **Bruno Simon's Portfolio** ([bruno-simon.com](https://bruno-simon.com)): Full 3D world rendered with Three.js (now using WebGPU via TSL). The entire page IS the 3D scene — user drives a car through it. Uses custom shaders, physics, and audio. The portfolio was completely reworked in 2025 with WebGPU support. ([CreativeDevJobs](https://www.creativedevjobs.com/blog/best-threejs-portfolio-examples-2025))
- **Samsy.ninja** (Samuel Honigstein): Cyberpunk neon-lit cityscape powered by WebGPU achieving 120+ FPS. First-person controls, holographic interfaces. This is the closest existing precedent to "The Tower" concept. ([CreativeDevJobs](https://www.creativedevjobs.com/blog/best-threejs-portfolio-examples-2025))
- **Three.js Journey** ([threejs-journey.com](https://threejs-journey.com)): Bruno Simon's comprehensive course covering all techniques needed for "The Tower" — HDRI environments, custom shaders, post-processing, fog, bloom, and Next.js/R3F integration.

### Learning Curve

| Aspect | Difficulty | Time Estimate |
|--------|-----------|---------------|
| Basic Three.js scene (box + light) | Easy | 1-2 hours |
| HDRI background + PBR materials | Easy-Medium | 1 day |
| Custom GLSL shaders | Hard | 2-4 weeks to be comfortable |
| Full immersive scene with post-processing | Medium-Hard | 1-2 weeks with R3F/Drei |

### Bundle Size

- **three.js core**: ~505-526 KB unminified, **~130 KB gzipped** ([Reddit — Bundle Size Discussion](https://www.reddit.com/r/threejs/comments/1aq3fhk/webpack_results_in_larger_builds/))
- Tree-shaking has improved since r141, but Three.js architecture still limits aggressive tree-shaking — the WebGLRenderer pulls in most shaders/materials regardless ([Three.js Forum](https://discourse.threejs.org/t/how-to-reduce-bundle-size-with-webpack/14607))
- **Best practice**: Use Vite (not webpack), lazy-load the canvas with `import()` so Three.js loads concurrently with your main app bundle ([Reddit](https://www.reddit.com/r/threejs/comments/1aq3fhk/webpack_results_in_larger_builds/))

### Next.js Compatibility

Three.js itself is a pure client-side WebGL library. It **cannot run on the server** — there is no DOM/canvas in Node.js. This is fine: you simply ensure it only runs client-side (see R3F section below).

---

## 2. React Three Fiber (R3F) — Next.js 16 Integration

### What Is R3F?

React Three Fiber (`@react-three/fiber`) is a **React renderer for Three.js**, not a wrapper or abstraction layer. Every `<mesh>`, `<boxGeometry>`, `<meshStandardMaterial>` JSX element directly creates the corresponding `THREE.*` object. There is zero performance overhead vs raw Three.js — in fact, R3F can outperform raw Three.js at scale thanks to React's scheduler and concurrent features. ([R3F Docs](https://r3f.docs.pmnd.rs/getting-started/introduction), [Vercel Blog](https://vercel.com/blog/building-an-interactive-webgl-experience-in-next-js))

**Version compatibility:**
- `@react-three/fiber@8` → React 18
- `@react-three/fiber@9` → React 19 (current stable)
- `@react-three/fiber@10` → upcoming
- Next.js 16 uses React 19, so **use R3F v9** ([Reddit — R3F + Next.js 15/React 19](https://www.reddit.com/r/threejs/comments/1jhh42d/how_to_integrate_r3f_into_react_nextjs_15_react_19/))

### SSR Issues & Solutions

**The core issue:** Three.js requires a `<canvas>` element and WebGL context, which don't exist on the server. If Next.js tries to server-render a component containing `<Canvas>`, it will crash.

**The standard solution — `next/dynamic` with `ssr: false`:**

```tsx
// components/Scene.tsx
'use client';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';

export default function Scene() {
  return (
    <Canvas>
      <ambientLight />
      <Environment preset="city" background />
      {/* Your 3D content */}
    </Canvas>
  );
}

// app/page.tsx  
import dynamic from 'next/dynamic';

const Scene = dynamic(() => import('./components/Scene'), {
  ssr: false,
  loading: () => <div className="loading-placeholder" />
});

export default function Home() {
  return (
    <main>
      <Scene /> {/* Full-screen 3D background */}
      <div className="ui-overlay"> {/* React UI on top */}
        <h1>Welcome to The Tower</h1>
      </div>
    </main>
  );
}
```

**Key distinction** ([Reddit — Dynamic import vs use client](https://www.reddit.com/r/nextjs/comments/189nybf/dynamic_import_with_ssr_false_vs_client_components/)):
- `'use client'` alone still pre-renders HTML on the server and hydrates on client
- `dynamic(() => ..., { ssr: false })` means **nothing happens on the server** — the component only loads and renders in the browser
- For Three.js/R3F, you need **both**: `'use client'` on the component AND `dynamic` with `ssr: false` on the import

**Known issues with Next.js 15+ / React 19:**
- Some developers report `ReactCurrentOwner` TypeError when R3F creates its renderer. This is usually a React version mismatch (having two React copies bundled). Fix: ensure a single React version with `--legacy-peer-deps` or `yarn` resolution. ([Stack Overflow](https://stackoverflow.com/questions/79657951/persistent-reactcurrentowner-typeerror-with-react-three-fiber-in-next-js-15-3))
- Drei's `<View>` component (for embedding multiple 3D views in a page) requires careful setup with dynamic imports — [Stack Overflow example](https://stackoverflow.com/questions/78940929/use-r3f-drei-view-in-nextjs)

### The R3F Ecosystem

The R3F ecosystem is **extensive** and covers essentially everything "The Tower" needs:

| Package | Purpose | Relevance to "The Tower" |
|---------|---------|--------------------------|
| `@react-three/fiber` | Core renderer | Foundation — renders Three.js via React |
| `@react-three/drei` | 200+ helpers & abstractions | `<Environment>`, `<Sky>`, `<Stars>`, `<Html>`, `<Float>`, `<PerformanceMonitor>`, `<Detailed>` (LOD), `<View>` |
| `@react-three/postprocessing` | Post-processing effects | Bloom, depth of field, SSAO, vignette, color grading |
| `@react-three/rapier` | Physics engine | Could animate objects, but probably overkill for background |
| `@react-three/gltfjsx` | GLTF → JSX converter | Turn 3D models into reusable React components |
| `r3f-perf` | Performance monitor | Dev-time FPS/memory/draw call monitoring |

**Drei's `<Environment>` component** is particularly relevant — it wraps HDRI loading into a single declarative component:

```tsx
import { Environment } from '@react-three/drei';

// Using a preset (not for production — relies on CDN)
<Environment preset="city" background />

// Using your own HDRI (production-ready)
<Environment files="/hdri/nyc-night-4k.hdr" background />

// Custom environment with any mesh
<Environment background>
  <mesh scale={100}>
    <sphereGeometry args={[1, 64, 64]} />
    <meshBasicMaterial map={nycTexture} side={THREE.BackSide} />
  </mesh>
</Environment>
```

([Drei Docs — Environment](https://drei.docs.pmnd.rs/staging/environment))

### Learning Curve

If you know React, R3F is significantly easier than raw Three.js. You think in components, not imperative draw calls. The jump is mainly learning Three.js concepts (scenes, cameras, materials, geometry) — R3F just gives you a React-native way to express them.

**Estimated ramp-up for a React developer:**
- R3F basics: 2-3 days
- Drei ecosystem familiarity: 1 week
- Post-processing + custom effects: 1-2 weeks

---

## 3. WebGL Shaders — Atmospheric Effects

### What You Need for "The Tower"

| Effect | Technique | Complexity | Solo Dev Feasible? |
|--------|-----------|------------|-------------------|
| **Fog / Atmospheric haze** | Built-in `THREE.Fog` / `THREE.FogExp2`, or custom GLSL | Low-Medium | Yes — built-in, or 2-3 GLSL lines for height fog |
| **Light bloom** | `@react-three/postprocessing` `<Bloom>` | Low | Yes — one component, tune 3 props |
| **Depth of field (bokeh)** | `<DepthOfField>` from postprocessing | Low | Yes — one component |
| **Day/night transitions** | Custom sky shader + tween uniforms | Medium-Hard | Yes with effort — 1-2 weeks |
| **Volumetric light rays** | Custom GLSL fragment shader | Hard | Possible but time-intensive |
| **Parallax (camera-reactive)** | Mouse-driven camera position offset | Low | Yes — 10 lines in `useFrame` |

### Fog

Three.js has two built-in fog modes — `Fog` (linear) and `FogExp2` (exponential). For more realism, you can inject custom GLSL into the shader to create **height fog** (fog that's denser near the ground, as seen looking down from a high-rise):

```glsl
// Custom height fog in fragment shader
float fogFactor = smoothstep(fogNear, fogFar, vWorldPosition.y);
gl_FragColor.rgb = mix(fogColor, gl_FragColor.rgb, fogFactor);
```

A developer on the Three.js forum demonstrated **Wenzel's height fog** with animated Perlin noise for extra atmospheric detail, calling it "just 2-3 extra lines of code to the noise generation." ([Reddit — Customizing Shaders for Fog](https://www.reddit.com/r/threejs/comments/1g5sogf/customizing_threejss_shaders_for_terrain_fog/))

The **WebGPU-era approach** (Three.js r165+) uses TSL (Three Shader Language) to customize fog nodes without raw GLSL — significantly simpler. ([YouTube — Threejs Horizon Fog](https://www.youtube.com/watch?v=wO72lVKQadc))

### Bloom

Using `@react-three/postprocessing`, bloom is trivially easy:

```tsx
import { EffectComposer } from '@react-three/postprocessing';
import { Bloom } from '@react-three/postprocessing';

<EffectComposer>
  <Bloom
    mipmapBlur
    luminanceThreshold={0.9}
    luminanceSmoothing={0.025}
    intensity={1.5}
  />
</EffectComposer>
```

**Key insight:** Bloom is **selective by default**. Materials only glow if their color values exceed the luminance threshold (>1.0 in linear space). Use `emissive` + `emissiveIntensity` + `toneMapped={false}` to make specific objects glow (e.g., city lights, window reflections). ([React Postprocessing Docs — Bloom](https://react-postprocessing.docs.pmnd.rs/effects/bloom))

### Depth of Field

```tsx
import { DepthOfField } from '@react-three/postprocessing';

<DepthOfField
  focusDistance={0.01}
  focalLength={0.02}
  bokehScale={6}
/>
```

Three.js also has `BokehShader2` for more advanced bokeh computation. For "The Tower," DOF could blur the far NYC skyline slightly while keeping the near-field window frame sharp — creating an immersive depth effect. ([Three.js Forum — Bokeh](https://discourse.threejs.org/t/bokeh-computation-with-bokehshader2/21043))

### Day/Night Transitions

Several approaches exist:

1. **Pre-baked approach (easiest):** Load two HDRI maps (day and night NYC) and crossfade between them using uniform interpolation
2. **Procedural sky shader:** Three.js includes a `Sky` shader (Preetham model) that simulates atmospheric scattering based on sun position. Animate the sun angle to transition through times of day. ([Three.js Forum — Complete Sky System](https://discourse.threejs.org/t/complete-sky-system-for-three-js-skybox-sun-moon-day-night-cycle-clouds-stars-lensflares/88311))
3. **Custom shader + environment blending:** Combine a procedural sky dome with environment intensity controls. The developer behind Planpoint demonstrated this with R3F — custom fog + Environment component intensity control for smooth cycle changes. ([YouTube — Threejs Horizon Fog](https://www.youtube.com/watch?v=wO72lVKQadc))
4. **threex.daynight extension**: Provides sun sphere, sun light, sky dome, and star field components with `sunAngle` control. ([GitHub — threex.daynight](https://github.com/jeromeetienne/threex.daynight))

**Complexity assessment:** A basic day/night with HDRI crossfade is a few days of work. A full procedural sky with sunrise/sunset color transitions, animated fog, and dynamic lighting is 1-2 weeks for a solo dev.

### Parallax (Camera-Reactive Background)

This is trivially easy in R3F and gives the most "immersive window" feel:

```tsx
function ParallaxCamera() {
  const { camera } = useThree();
  
  useFrame(({ pointer }) => {
    // Subtle camera rotation based on mouse position
    camera.rotation.y = THREE.MathUtils.lerp(
      camera.rotation.y,
      pointer.x * 0.05,
      0.1
    );
    camera.rotation.x = THREE.MathUtils.lerp(
      camera.rotation.x,
      -pointer.y * 0.03,
      0.1
    );
  });
  
  return null;
}
```

This alone — an HDRI background with mouse-driven parallax — would already feel like looking out a window.

### GLSL Complexity for a Solo Dev

**Honest assessment:** You do NOT need to write raw GLSL for "The Tower." The R3F/Drei/Postprocessing ecosystem provides declarative components for fog, bloom, DOF, environment maps, and sky. Custom GLSL is only needed if you want:
- Truly unique atmospheric effects (e.g., rain on window glass, volumetric god rays)
- A custom shader for the city lights twinkling effect
- Highly optimized effects that can't be achieved with the postprocessing library

For the MVP, **zero custom GLSL is required.** You can achieve a stunning result with: `<Environment>` + `<Bloom>` + `<DepthOfField>` + mouse-driven parallax.

---

## 4. Performance — FPS, Memory, Optimization

### Can You Have a Three.js Background AND React UI Without Jank?

**Yes — this is a well-established pattern.** The approach:

1. Three.js `<Canvas>` renders at `position: fixed; z-index: -1` as a full-screen background
2. React DOM renders on top with normal HTML/CSS (`z-index: 1+`)
3. The two rendering systems are independent — React DOM doesn't interfere with the WebGL render loop

**Chrome handles this well** with near-zero performance impact from HTML overlays. Firefox historically had ~5-10 FPS drop per overlay element due to weaker compositing, but modern Firefox (141+) has improved significantly. ([GitHub Issue — HUD over WebGL](https://github.com/mrdoob/three.js/issues/1959))

Vercel used exactly this pattern for the Next.js Conf registration page — R3F canvas with postprocessing behind interactive React UI elements. ([Vercel Blog](https://vercel.com/blog/building-an-interactive-webgl-experience-in-next-js))

### Key Performance Numbers

| Metric | Target | Notes |
|--------|--------|-------|
| Draw calls per frame | **< 100** | Above 500 struggles even on powerful GPUs ([Utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips)) |
| FPS | **60** (or 30 on mobile) | GitHub Globe degrades quality if < 55.5 FPS over 50 frames ([GitHub Blog](https://github.blog/engineering/engineering-principles/how-we-built-the-github-globe/)) |
| Three.js bundle (gzipped) | **~130 KB** | ([Reddit](https://www.reddit.com/r/threejs/comments/1aq3fhk/webpack_results_in_larger_builds/)) |
| HDRI texture (4K) | **4-8 MB download**, **64 MB+ VRAM** | A 4K texture = ~64 MB VRAM ([Utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips)) |
| Memory target | Stable after load | Monitor with `renderer.info.memory` |

### "The Tower" Performance Profile

For an HDRI skyline background with atmospheric post-processing, the scene is actually **lightweight** compared to typical Three.js apps:

- **Draw calls:** Very low (<10). An HDRI background is a single textured sphere/quad. Add a few interior elements (window frame, floor) and you're maybe at 5-15 draw calls.
- **Triangle count:** Minimal. No complex 3D models — the realism comes from the HDRI image, not geometry.
- **Post-processing:** Bloom + DOF adds 2-3 extra render passes. On modern hardware, this is negligible.
- **Main cost:** The HDRI texture load (one-time) and the post-processing shader execution per frame.

**Estimate: 55-60 FPS on mid-range hardware, easily 60 FPS on modern devices.**

### Optimization Best Practices

#### Adaptive Quality (Critical)

The single most important optimization — auto-adjust quality based on device performance:

```tsx
function App() {
  const [dpr, setDpr] = useState(1.5);
  
  return (
    <Canvas dpr={dpr}>
      <PerformanceMonitor
        onDecline={() => setDpr(1)}    // Drop resolution if FPS low
        onIncline={() => setDpr(2)}    // Increase if FPS high
        flipflops={3}                  // Give up after 3 oscillations
        onFallback={() => setDpr(1)}   // Settle on low quality
      >
        <Scene />
        <Effects />
      </PerformanceMonitor>
    </Canvas>
  );
}
```

([R3F Docs — Scaling Performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance))

#### On-Demand Rendering

If the background is mostly static (HDRI + subtle parallax), use `frameloop="demand"` to render only when something changes:

```tsx
<Canvas frameloop="demand">
```

Then call `invalidate()` when the user moves their mouse. This saves battery massively on laptops/mobile. ([R3F Docs — On-demand Rendering](https://r3f.docs.pmnd.rs/advanced/scaling-performance))

#### Movement Regression

During scroll or rapid mouse movement, temporarily reduce quality:

```tsx
<Canvas performance={{ min: 0.5 }}>
  {/* R3F auto-regresses DPR during movement */}
</Canvas>
```

([R3F Docs](https://r3f.docs.pmnd.rs/advanced/scaling-performance))

#### Code Splitting

Lazy-load the entire Three.js canvas so it doesn't block initial page render:

```tsx
const Scene = dynamic(() => import('./Scene'), { ssr: false });
```

The Vite/Next.js bundler creates a separate chunk, loaded concurrently with main content. ([Reddit](https://www.reddit.com/r/threejs/comments/1aq3fhk/webpack_results_in_larger_builds/))

#### Texture Optimization

- Use **KTX2 compression** for textures (10x memory reduction) ([Utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips))
- Use **2K HDRI for mobile**, 4K for desktop
- Consider a JPEG equirectangular panorama instead of HDR for the background (much smaller, still looks great if you don't need reflections)

#### R3F-Specific Pitfalls

- **Never use `setState` in `useFrame`** — mutate refs directly ([R3F Docs — Pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls))
- **Always use `delta`** for frame-rate independence: `rotation.x += delta * speed`, not `rotation.x += 0.01`
- **Reuse geometries and materials** — create them once outside the component
- **`React.memo`** expensive 3D components to prevent re-renders
- **Toggle `visible` instead of unmounting** — avoids recreating GPU buffers

#### GitHub Globe's Four Quality Tiers (Production Example)

GitHub implemented a graduated degradation system ([GitHub Blog](https://github.blog/engineering/engineering-principles/how-we-built-the-github-globe/)):
1. Reduce pixel density (2.0 → 1.5)
2. Reduce data density (fewer animated elements)
3. Raycast less frequently
4. Reduce geometry density (12,000 → 8,000 circles)

This is an excellent pattern for "The Tower" — you could:
1. Drop DPR
2. Disable bloom
3. Reduce HDRI resolution
4. Switch to static image background as last resort

---

## 5. Production Website Examples: Three.js/R3F Behind Functional UI

### 1. Stripe.com — Homepage Gradient

**URL:** [stripe.com](https://stripe.com)  
**Technique:** Three.js canvas (`data-engine="three.js r178"`) rendering animated mesh gradient background behind the full marketing homepage UI. Custom GLSL shaders create flowing color gradients with noise. The gradient runs in a vertex shader for performance (10x fewer computations than fragment shader). ([Reddit — Stripe wave animation](https://www.reddit.com/r/webdesign/comments/1qqe7ao/anyone_know_how_they_did_this_wave_animation_on/))  
**Relevance:** Proves Three.js as background behind complex, functional UI at massive scale.

### 2. GitHub.com — Homepage Globe

**URL:** [github.com](https://github.com)  
**Technique:** Three.js WebGL globe showing real-time PR activity. Five layers (halo, globe, regions, spikes, arcs). No textures — all procedural. ~12,000 instanced circles for Earth. Custom shaders for halo and atmospheric falloff. SVG placeholder with crossfade transition on load. Four-tier quality degradation. ([GitHub Engineering Blog](https://github.blog/engineering/engineering-principles/how-we-built-the-github-globe/))  
**Relevance:** Gold standard for 3D element behind functional homepage with adaptive performance.

### 3. Vercel Next.js Conf — Registration Page

**URL:** (Historical — nextjs.org/conf)  
**Technique:** React Three Fiber + Drei + postprocessing. Interactive light-beam prism game. Cursor-following ray with reflections, bloom, color LUT, screen-space reflections. `PerformanceMonitor` for adaptive DPR. Built by Paul Henschel (R3F lead maintainer) at Vercel. ([Vercel Blog](https://vercel.com/blog/building-an-interactive-webgl-experience-in-next-js))  
**Relevance:** Proof that R3F + Next.js works in production at Vercel's own scale.

### 4. Vercel Ship 2024 — Interactive Badge

**URL:** (Historical — vercel.com/ship)  
**Technique:** R3F + Drei + `react-three-rapier` (physics). Dropping lanyard badge with physics simulation. Blender-optimized models. MeshLine for rope rendering. ([Vercel Blog — Ship Badge](https://vercel.com/blog/building-an-interactive-3d-event-badge-with-react-three-fiber))  
**Relevance:** R3F + physics in production Next.js app.

### 5. Lusion.co — Award-Winning Studio

**URL:** [lusion.co](https://lusion.co)  
**Technique:** Full Three.js immersive background on every page. Mouse-reactive particle/fluid effects behind text content. Built projects for Devin AI, and others. Multiple Awwwards wins. ([Lusion Website](https://lusion.co), [Three.js Forum](https://discourse.threejs.org/t/background-animation-on-lusion-co-about-page/62610))  
**Relevance:** Commercial studio website with immersive 3D background behind functional UI/text.

### 6. Igloo.inc — Landing Page

**URL:** [igloo.inc](https://igloo.inc)  
**Technique:** Three.js-powered creative landing page for immersive technology company. Featured on Three.js forum showcase. ([Three.js Forum](https://discourse.threejs.org/t/landing-site-igloo-inc/67249), [ThreeJS Resources](https://threejsresources.com/showcase))  
**Relevance:** Commercial landing page using Three.js behind functional content.

### 7. Hut8.com — Crypto Mining Company

**URL:** [hut8.com](https://www.hut8.com/)  
**Technique:** Three.js 3D elements integrated into corporate website. Featured on ThreeJS Resources showcase. ([ThreeJS Resources](https://threejsresources.com/showcase))  
**Relevance:** Corporate/fintech company using Three.js for brand differentiation.

### 8. Planpoint — Architectural Visualization

**URL:** [planpoint-next3d.vercel.app](https://planpoint-next3d.vercel.app/)  
**Technique:** R3F with custom fog, Environment component intensity control, day/night cycle. Uses WebGPU when available. Architecture industry — closest domain to "The Tower" concept. ([YouTube — Threejs Horizon Fog](https://www.youtube.com/watch?v=wO72lVKQadc), [ThreeJS Resources](https://threejsresources.com/showcase))  
**Relevance:** Architectural/real-estate tool with day/night cycle — very close to "The Tower" use case.

### 9. 3D E-Commerce (R3F)

**URL:** [3d-ecommerce-r3f.vercel.app](https://3d-ecommerce-r3f.vercel.app/)  
**Technique:** Full e-commerce application built with R3F. Product browsing with 3D models, React Router, cart functionality. ([Reddit](https://www.reddit.com/r/reactjs/comments/1cphaks/build_a_3d_ecommerce_application_using_react/))  
**Relevance:** Proves R3F can power a functional application (not just art pieces), with routing and state management.

### 10. NASA Eyes on the Solar System

**URL:** [eyes.nasa.gov](https://eyes.nasa.gov/)  
**Technique:** Three.js-powered interactive visualization of the solar system. Full 3D experience behind NASA's informational UI. ([ThreeJS Resources](https://threejsresources.com/showcase))  
**Relevance:** Data-rich functional application with Three.js 3D environment.

---

## 6. Technology Comparison Summary

| Criteria | Three.js (Raw) | R3F + Drei | Pure CSS/Canvas 2D |
|----------|----------------|------------|---------------------|
| **Photorealistic NYC skyline** | Yes (HDRI) | Yes (HDRI via `<Environment>`) | No — flat gradients only |
| **Depth / Parallax** | Yes | Yes (easier) | Limited (CSS transforms) |
| **Atmospheric effects** | Yes (GLSL) | Yes (declarative postprocessing) | No |
| **Day/night transitions** | Yes (shaders) | Yes (shaders + helpers) | Very limited |
| **React integration** | Manual (imperative) | Native (declarative JSX) | N/A |
| **Next.js SSR compatibility** | Needs `ssr: false` | Needs `ssr: false` | Native |
| **Bundle size (gzipped)** | ~130 KB | ~150 KB (R3F adds ~20 KB) | 0 KB |
| **Learning curve (React dev)** | Steep | Moderate | Low |
| **Overkill for "The Tower"?** | No | **No — right-sized** | Yes (can't achieve the vision) |
| **Recommended?** | Use via R3F | **Yes — primary choice** | No |

---

## 7. Recommendation for "The Tower"

### Verdict: R3F + Drei + Postprocessing is the Right Choice

**Not overkill. Right-sized.** Here's why:

1. **The vision demands 3D.** A photorealistic NYC skyline with parallax, depth, bloom, and atmospheric effects cannot be achieved with CSS or 2D Canvas. Three.js/WebGL is the only web technology that can deliver this.

2. **R3F makes it manageable for a solo dev.** Instead of writing hundreds of lines of imperative Three.js code, you write declarative React components. The Drei ecosystem handles 80% of what you need out of the box.

3. **Bundle size is acceptable.** ~150 KB gzipped for R3F + Three.js is comparable to a UI component library. Lazy-load it so it doesn't affect initial page load.

4. **Performance is a non-issue for this use case.** An HDRI background + a few post-processing effects is trivial compared to what Three.js handles in production (GitHub's 12,000 instanced circles, Stripe's realtime gradient shader). With `PerformanceMonitor` and adaptive DPR, you'll hit 60 FPS on most devices.

5. **Next.js 16 compatibility is proven.** Use `next/dynamic` with `ssr: false`. R3F v9 works with React 19. Vercel literally built their own conference pages this way.

### Recommended Stack for "The Tower"

```
@react-three/fiber@9      — Core renderer
@react-three/drei          — Environment, Stars, Float, PerformanceMonitor, Html
@react-three/postprocessing — Bloom, DepthOfField, Vignette
three                      — Underlying engine
```

### Suggested Architecture

```
┌──────────────────────────────────────────────┐
│  Next.js 16 App (SSR for SEO/content)        │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  <Canvas> (dynamic, ssr: false)      │    │
│  │  ├─ <Environment files="nyc.hdr" />  │    │
│  │  ├─ <ParallaxCamera />               │    │
│  │  ├─ <WindowFrame /> (3D mesh)        │    │
│  │  └─ <EffectComposer>                 │    │
│  │      ├─ <Bloom />                    │    │
│  │      ├─ <DepthOfField />             │    │
│  │      └─ <Vignette />                 │    │
│  └──────────────────────────────────────┘    │
│       z-index: -1, position: fixed           │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  React UI (normal HTML/CSS/Tailwind) │    │
│  │  ├─ Navigation                       │    │
│  │  ├─ Floor Cards / Feature Sections   │    │
│  │  ├─ Dashboard Widgets                │    │
│  │  └─ Footer                           │    │
│  └──────────────────────────────────────┘    │
│       z-index: 1+, position: relative        │
│                                              │
└──────────────────────────────────────────────┘
```

### Quick-Start Implementation Plan

1. **Day 1:** Set up R3F in Next.js 16 with `dynamic` import, render a basic `<Canvas>` with `<Environment preset="city" background />`
2. **Day 2:** Source a proper NYC HDRI (see HDRI sources above), add mouse-driven parallax camera
3. **Day 3:** Add `<Bloom>` and `<DepthOfField>` postprocessing, add `<Vignette>` for immersive framing
4. **Day 4:** Overlay React UI on top, ensure z-indexing and pointer events work correctly
5. **Day 5:** Implement `<PerformanceMonitor>` for adaptive quality, test on low-end devices
6. **Week 2:** Add day/night transition (HDRI crossfade), fog effects, city light bloom
7. **Week 3:** Polish — loading placeholder (SVG or blurred image, à la GitHub), mobile fallback (static high-res image)

---

## 8. Sources

All sources are cited inline throughout the document. Key references:

- [R3F Documentation — Introduction](https://r3f.docs.pmnd.rs/getting-started/introduction)
- [R3F Documentation — Scaling Performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- [R3F Documentation — Performance Pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)
- [Drei Documentation — Environment](https://drei.docs.pmnd.rs/staging/environment)
- [React Postprocessing — Bloom](https://react-postprocessing.docs.pmnd.rs/effects/bloom)
- [Vercel Blog — Building Interactive WebGL in Next.js](https://vercel.com/blog/building-an-interactive-webgl-experience-in-next-js)
- [Vercel Blog — Interactive 3D Event Badge](https://vercel.com/blog/building-an-interactive-3d-event-badge-with-react-three-fiber)
- [GitHub Engineering — How We Built the Globe](https://github.blog/engineering/engineering-principles/how-we-built-the-github-globe/)
- [Utsubo — 100 Three.js Performance Tips (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
- [Three.js Forum — Realistic Ambience in Architectural Scenes](https://discourse.threejs.org/t/achieving-realistic-ambience-in-architectural-three-js-scenes/89753)
- [Three.js Forum — LOD Performance](https://discourse.threejs.org/t/when-is-it-actually-beneficial-to-use-lod-in-three-js-for-performance/87697)
- [Three.js Forum — Complete Sky System](https://discourse.threejs.org/t/complete-sky-system-for-three-js-skybox-sun-moon-day-night-cycle-clouds-stars-lensflares/88311)
- [CreativeDevJobs — Best Three.js Portfolios 2025](https://www.creativedevjobs.com/blog/best-threejs-portfolio-examples-2025)
- [ThreeJS Resources Showcase](https://threejsresources.com/showcase)
- [Reddit — R3F + Next.js 15/React 19 Integration](https://www.reddit.com/r/threejs/comments/1jhh42d/how_to_integrate_r3f_into_react_nextjs_15_react_19/)
- [Reddit — Three.js Bundle Size](https://www.reddit.com/r/threejs/comments/1aq3fhk/webpack_results_in_larger_builds/)
- [Reddit — Dynamic Import vs Client Components](https://www.reddit.com/r/nextjs/comments/189nybf/dynamic_import_with_ssr_false_vs_client_components/)
