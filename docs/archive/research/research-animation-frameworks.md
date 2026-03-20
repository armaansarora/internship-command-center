# Research: Remotion, Framer Motion, GSAP, Rive, CSS, Motion One, Theatre.js for an immersive Next.js 16 app

## Executive summary

For an immersive Next.js 16 product that should feel like a luxury video game, **GSAP + WebGL/Three.js or React Three Fiber is the strongest primary motion stack**, with **Motion for React** used selectively for React-native layout transitions and UI choreography, and **Rive** used for high-polish interactive vector components like loaders, icons, HUD elements, and ambient microinteractions ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [GSAP Timeline docs](https://gsap.com/docs/v3/GSAP/Timeline/), [Motion for React](https://motion.dev/docs/react), [Rive React runtime](https://rive.app/docs/runtimes/react/react)).

**Remotion is not the right primary engine for a live immersive app background** unless the background is conceptually a video player or rendered composition preview, because Remotion positions itself around making videos programmatically and its Player is framed as an embeddable interactive video preview that can be connected to server-side rendering into MP4s ([Remotion docs](https://www.remotion.dev/docs/), [Remotion fundamentals](https://www.remotion.dev/docs/the-fundamentals), [Remotion Player landing page](https://www.remotion.dev/player), [Remotion Player docs](https://www.remotion.dev/docs/player/player)).

**Motion for React can absolutely deliver polished cinematic transitions**, including complex shared-element transitions, layout choreography, scroll-linked effects, and state-driven page motion, but it is still fundamentally a React UI animation library rather than a full scene orchestration engine for deep scroll-storytelling or WebGL-heavy experiences ([Motion for React](https://motion.dev/docs/react), [Motion layout animations](https://motion.dev/docs/react-layout-animations)).

**Pure CSS is much better in 2025/2026 than it was a few years ago**, especially with scroll-driven animations, View Transitions, and `@starting-style`, but CSS-only approaches are still best treated as a high-performance layer for simpler transitions, reveal effects, and some scroll choreography rather than the whole stack for high-end cinematic worlds ([MDN scroll-driven animations guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations), [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API), [MDN @starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style)).

The pattern visible across immersive Awwwards-caliber experiences is consistent: **3D/rendering tech handles the world, GSAP often handles scroll sequencing, and React/Next.js handles app structure**, while specialized tools like Framer Motion or Rive are added for local UI polish rather than used as the sole immersive engine ([Awwwards Noomo ValenTime case study](https://www.awwwards.com/noomo-valentime-immersive-storytelling-about-love.html), [Awwwards J-Vers case study](https://www.awwwards.com/case-study-j-vers-site.html), [Awwwards immersive WebGL exhibitions article](https://www.awwwards.com/immersive-webgl-virtual-gallery-exhibition-collection.html), [Awwwards Medal of Honor page](https://www.awwwards.com/sites/medal-of-honor-above-beyond)).

## Best-fit recommendation for your use case

### Recommended stack

1. **Core immersive engine:** Three.js / React Three Fiber + shaders/WebGL/WebGPU where needed, based on the same stack patterns described in immersive Awwwards examples such as Noomo ValenTime and J-Vers ([Awwwards Noomo ValenTime case study](https://www.awwwards.com/noomo-valentime-immersive-storytelling-about-love.html), [Awwwards J-Vers case study](https://www.awwwwards.com/case-study-j-vers-site.html)).
2. **Primary sequencing and scroll choreography:** GSAP + ScrollTrigger for scene timing, section pinning, scrubbed camera movement, snapping, and complex timelines ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [GSAP Timeline docs](https://gsap.com/docs/v3/GSAP/Timeline/)).
3. **UI/layout transitions:** Motion for React for shared layout transitions, modal/page transitions, gesture responses, and state-driven UI motion inside React ([Motion for React](https://motion.dev/docs/react), [Motion layout animations](https://motion.dev/docs/react-layout-animations)).
4. **Vector interactive details:** Rive for premium buttons, icons, holographic UI modules, characterful loaders, HUD flourishes, and ambient looping vector elements ([Rive Web JS runtime](https://rive.app/docs/runtimes/web/web-js), [Rive React runtime](https://rive.app/docs/runtimes/react/react)).
5. **Native/browser layer:** CSS scroll-driven animations, View Transitions, and `@starting-style` for lighter transitions where browser-native motion is enough ([MDN scroll-driven animations guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations), [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API), [MDN @starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style)).

### Tools I would not choose as the primary immersive engine

- **Remotion** for live immersive backgrounds, because its center of gravity is programmatic video creation and player-based previews rather than persistent app-world rendering ([Remotion docs](https://www.remotion.dev/docs/), [Remotion fundamentals](https://www.remotion.dev/docs/the-fundamentals), [Remotion Player landing page](https://www.remotion.dev/player)).
- **Motion for React alone** for a full game-like world, because while it is strong at React motion, its docs position it around layout, gestures, and scroll animation inside UI rather than large cinematic scene systems ([Motion for React](https://motion.dev/docs/react), [Motion layout animations](https://motion.dev/docs/react-layout-animations)).
- **CSS alone** for a true premium 3D/cinematic experience, because the platform can now do much more but still does not replace timeline-heavy orchestration, live 3D scenes, or advanced shader-like effects ([MDN scroll-driven animations guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations), [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)).

---

## 1) Remotion

### What it is exactly

Remotion describes itself as a framework to **“make videos programmatically”** and its fundamentals page explains the model as getting a frame number and a blank canvas to render with React ([Remotion docs](https://www.remotion.dev/docs/), [Remotion fundamentals](https://www.remotion.dev/docs/the-fundamentals)).

Its core abstraction is the **composition**, which combines a React component with video metadata such as width, height, duration in frames, and FPS ([Remotion fundamentals](https://www.remotion.dev/docs/the-fundamentals)).

That framing makes Remotion fundamentally a **programmatic video system built in React**, not a general-purpose runtime for interactive app scenes ([Remotion docs](https://www.remotion.dev/docs/), [Remotion fundamentals](https://www.remotion.dev/docs/the-fundamentals)).

### Can it power real-time interactive UI?

Partially, but only in a constrained sense: the **Remotion Player** can render a Remotion composition inside a regular React app, including Next.js, and it supports runtime prop changes, playback controls, events, and imperative methods like `play`, `pause`, and `seekTo` ([Remotion Player docs](https://www.remotion.dev/docs/player/player), [Remotion Player landing page](https://www.remotion.dev/player)).

The Player docs even note `overflowVisible` as useful when the player contains “interactive elements in the video such as draggable elements,” which shows that some interactivity is possible inside a composition ([Remotion Player docs](https://www.remotion.dev/docs/player/player)).

But Remotion consistently positions this as **embedded interactive video previewing** that can later be rendered into real MP4 output via Node.js or AWS Lambda, not as a persistent real-time UI engine for app worlds ([Remotion Player landing page](https://www.remotion.dev/player), [Remotion API overview](https://www.remotion.dev/docs/api)).

### Is it right for an immersive app background?

Usually **no**, unless your background is literally a video-like composition or data-driven video preview ([Remotion Player landing page](https://www.remotion.dev/player), [Remotion Player docs](https://www.remotion.dev/docs/player/player)).

A Remotion background would be strongest when you want **programmatically authored cinematic media** with deterministic playback, exported video deliverables, or an app that lets users customize and render videos ([Remotion Player landing page](https://www.remotion.dev/player), [Remotion templates for Next.js](https://www.remotion.dev/templates/next)).

It is weak as the main engine for a living app background that should react fluidly to scroll, pointer, camera, and app state the way GSAP + WebGL systems do on immersive showcase sites ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [Awwwards Noomo ValenTime case study](https://www.awwwards.com/noomo-valentime-immersive-storytelling-about-love.html)).

### Next.js compatibility

Remotion supports installation into existing Next.js projects and also offers Next.js templates with the Player and rendering flows built in ([Installing Remotion in an existing project](https://www.remotion.dev/docs/brownfield), [Next.js Remotion template](https://www.remotion.dev/templates/next)).

However, the server-side renderer has headless-browser and FFmpeg dependencies that Remotion says make Next.js usage “a bit tricky,” and it is not officially supported in all self-hosted Next.js setups ([Using @remotion/renderer in Next.js](https://www.remotion.dev/docs/miscellaneous/nextjs)).

### Performance, realism, bundle, learning curve

Remotion’s runtime bundle on Bundlephobia is listed at **121.9 kB minified / 38.6 kB gzip** for `remotion` ([Bundlephobia remotion](https://bundlephobia.com/package/remotion)).

That size is not outrageous, but the bigger concern is not bytes alone; it is the **mental model mismatch** between frame-based video composition and a modern immersive app runtime ([Remotion fundamentals](https://www.remotion.dev/docs/the-fundamentals)).

Its realism ceiling is high for authored cinematic sequences because you can build anything React can render frame by frame, but that realism is better suited to **video rendering** than **interactive world simulation** ([Remotion fundamentals](https://www.remotion.dev/docs/the-fundamentals), [Remotion Player landing page](https://www.remotion.dev/player)).

The learning curve is moderate if you are comfortable with React, but the workflow is specialized because you must think in compositions, frame timing, and rendering pipelines ([Remotion fundamentals](https://www.remotion.dev/docs/the-fundamentals)).

### Verdict on Remotion

**Use Remotion if the product includes programmatic video generation, cinematic previews, or user-customizable rendered media.** ([Remotion Player landing page](https://www.remotion.dev/player), [Remotion API overview](https://www.remotion.dev/docs/api)).

**Do not use Remotion as the main engine for an immersive Next.js 16 UI background** unless the background is intentionally a video/composition layer rather than a real-time world ([Remotion docs](https://www.remotion.dev/docs/), [Remotion Player docs](https://www.remotion.dev/docs/player/player)).

---

## 2) Framer Motion / Motion for React

### What it is now

The Framer Motion lineage now lives under **Motion**, whose React docs position it as a React animation library for spring, gesture, scroll, and layout animation with a hybrid engine designed for smooth browser performance ([Motion for React](https://motion.dev/docs/react)).

### Capabilities for immersive UI

Motion supports **entry/exit transitions** through `AnimatePresence`, **layout animations** through `layout`, **shared-element transitions** through `layoutId`, **scroll-triggered** motion through `whileInView`, and **scroll-linked** motion through `useScroll` and MotionValues ([Motion for React](https://motion.dev/docs/react), [Motion layout animations](https://motion.dev/docs/react-layout-animations)).

It also supports gestures like hover, tap, focus, and drag in a cross-device way, which is useful for premium HUD-like interaction layers ([Motion for React](https://motion.dev/docs/react)).

### Can it handle cinematic-quality transitions?

**Yes for UI and page choreography; only partly for full cinematic worlds.** ([Motion layout animations](https://motion.dev/docs/react-layout-animations), [Motion for React](https://motion.dev/docs/react)).

If your “elevator moving between floors” effect is fundamentally a **page/state transition with shared elements, camera-like container movement, depth cues, scaling, blur, and coordinated sequencing**, Motion can do that well inside React state transitions ([Motion layout animations](https://motion.dev/docs/react-layout-animations)).

Its layout system animates size and position changes using transforms, supports shared transitions with `layoutId`, and is explicitly designed for things like lists, accordions, grids, modal transitions, and reflow choreography ([Motion layout animations](https://motion.dev/docs/react-layout-animations)).

Where Motion starts to feel limited is when the experience becomes **long-form scroll storytelling, pinned scene choreography, nested timeline control, or 3D-world sequencing**, which are the areas GSAP and WebGL-centric stacks dominate ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [Awwwards J-Vers case study](https://www.awwwards.com/case-study-j-vers-site.html), [Awwwards Noomo ValenTime case study](https://www.awwwards.com/noomo-valentime-immersive-storytelling-about-love.html)).

### Performance and browser model

Motion says its hybrid engine runs natively in the browser using the **Web Animations API and ScrollTimeline for 120fps performance**, while falling back to JavaScript for springs, interruptible keyframes, and gesture tracking ([Motion for React](https://motion.dev/docs/react)).

Its layout system uses **CSS transforms** for animations, which avoids repeated layout recalculations and paints, and its docs contrast that favorably with the snapshot model of the View Transitions API ([Motion layout animations](https://motion.dev/docs/react-layout-animations)).

### Comparison vs View Transitions API

Motion’s own docs argue that its layout animations are more interruptible, more flexible for multiple simultaneous animations, less blocking for user interaction, and better at handling nested/relative animations than the browser View Transitions API ([Motion layout animations](https://motion.dev/docs/react-layout-animations)).

That matters for immersive UI because cinematic transitions usually need to be **interruptible, composable, and nested**, not just global screen wipes ([Motion layout animations](https://motion.dev/docs/react-layout-animations)).

### Next.js 16 compatibility

Motion is React-native in its programming model and does not present any unusual Next.js-specific warnings in the React docs, so it is a straightforward fit for client components in a Next.js app ([Motion for React](https://motion.dev/docs/react)).

### Bundle, learning curve, realism

Bundlephobia lists the `motion` package at **125.1 kB minified / 41.6 kB gzip** ([Bundlephobia motion](https://bundlephobia.com/package/motion)).

Motion’s effective learning curve is relatively low-to-moderate for React developers because the API is declarative and state-aligned ([Motion for React](https://motion.dev/docs/react)).

Its realism capability is **high for premium UI motion** and **medium for cinematic scene systems**; it excels at making interfaces feel alive, but it is not the natural first choice for the deepest Awwwards-style scroll-cinema stacks ([Motion for React](https://motion.dev/docs/react), [Motion layout animations](https://motion.dev/docs/react-layout-animations), [Awwwards immersive WebGL exhibitions article](https://www.awwwards.com/immersive-webgl-virtual-gallery-exhibition-collection.html)).

### Verdict on Motion for React

**Strong choice for page transitions, modal flows, navigation choreography, premium UI motion, and app-level immersive polish.** ([Motion for React](https://motion.dev/docs/react), [Motion layout animations](https://motion.dev/docs/react-layout-animations)).

**Not my first choice as the sole engine for luxury-game-style immersive environments** that rely on long-form scroll direction, pinned scenes, complex sequencing, or real 3D spaces ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [Awwwards Noomo ValenTime case study](https://www.awwwards.com/noomo-valentime-immersive-storytelling-about-love.html)).

---

## 3) GSAP (GreenSock)

### Why it is so strong for immersive websites

GSAP’s ScrollTrigger docs explicitly position it for “jaw-dropping scroll-based animations” with features like scrub, pin, snap, and timeline integration ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)).

For immersive websites, that matters because the hard part is rarely a single tween; it is **sequencing multiple elements and scenes against scroll, time, and user progression** ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [GSAP Timeline docs](https://gsap.com/docs/v3/GSAP/Timeline/)).

### Capabilities most relevant to your app

- **Scroll-linked control:** direct scrub against scroll position, including softened scrub behavior ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)).
- **Pinning:** keep sections locked while the animation plays, which is core to cinematic section-to-section movement ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)).
- **Snapping:** move users to the nearest label or milestone, which is ideal for “floors” or chapters ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)).
- **Timelines:** nest complex sequences, add labels, overlap scenes, speed up or reverse whole segments, and orchestrate intros/middles/outros as modular units ([GSAP Timeline docs](https://gsap.com/docs/v3/GSAP/Timeline/)).
- **Container animation / custom scrollers / proxying:** useful when scroll behavior is virtualized or mapped to custom containers ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)).

### Can GSAP handle cinematic-quality transitions like an elevator moving between floors?

**Yes — this is exactly the category where GSAP is strongest.** ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [GSAP Timeline docs](https://gsap.com/docs/v3/GSAP/Timeline/)).

An elevator metaphor usually needs pinning, scrubbed motion, snap points, camera easing, nested sequencing, and precise overlap control, all of which map naturally to ScrollTrigger + Timeline ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [GSAP Timeline docs](https://gsap.com/docs/v3/GSAP/Timeline/)).

### React / Next.js integration

GSAP’s React guide says its `useGSAP()` hook is **safe for SSR environments like Next.js**, uses an isomorphic layout effect pattern, and advises adding `"use client"` for app-router / React Server Component contexts ([GSAP React guide](https://gsap.com/resources/React/)).

It also emphasizes automatic cleanup via `gsap.context()`, which matters in React 18+ strict-mode environments where effects run twice locally ([GSAP React guide](https://gsap.com/resources/React/)).

### Performance framing

GSAP describes ScrollTrigger as **highly optimized**, saying scroll events are debounced, updates are synchronized with the screen refresh cycle, and position calculations are done up front rather than by constantly watching every element ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)).

That optimization model is exactly why GSAP remains common on high-end immersive sites even when teams are also using React and WebGL ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [Awwwards J-Vers case study](https://www.awwwards.com/case-study-j-vers-site.html), [Awwwards Noomo ValenTime case study](https://www.awwwards.com/noomo-valentime-immersive-storytelling-about-love.html)).

### Bundle, learning curve, realism

Bundlephobia lists `gsap` at **68.8 kB minified / 26.6 kB gzip**, and `@gsap/react` at **937 B minified / 551 B gzip** ([Bundlephobia gsap](https://bundlephobia.com/package/gsap), [Bundlephobia @gsap/react](https://bundlephobia.com/package/@gsap/react)).

That makes GSAP notably lighter than Motion or Remotion at baseline package level, although plugin usage and the rest of your stack still matter ([Bundlephobia gsap](https://bundlephobia.com/package/gsap), [Bundlephobia motion](https://bundlephobia.com/package/motion), [Bundlephobia remotion](https://bundlephobia.com/package/remotion)).

The learning curve is moderate-to-high because GSAP gives you enormous control, but that control is the reason it wins for cinematic work ([GSAP Timeline docs](https://gsap.com/docs/v3/GSAP/Timeline/), [GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)).

Its realism capability is **very high**, especially when paired with WebGL, Three.js, shaders, or React Three Fiber, because GSAP can orchestrate the camera, DOM, overlays, captions, pinned panels, and world transitions together ([Awwwards J-Vers case study](https://www.awwwards.com/case-study-j-vers-site.html), [Awwwards Noomo ValenTime case study](https://www.awwwards.com/noomo-valentime-immersive-storytelling-about-love.html)).

### Verdict on GSAP

**Best primary animation layer for a luxury-game-style immersive Next.js experience.** ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [GSAP React guide](https://gsap.com/resources/React/)).

If I had to choose one motion library for the immersive shell, it would be GSAP, with Motion and Rive added where they are strongest ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [Motion for React](https://motion.dev/docs/react), [Rive React runtime](https://rive.app/docs/runtimes/react/react)).

---

## 4) Rive

### What it is good at

Rive’s web runtime provides JavaScript and TypeScript APIs, supports state machines, and offers both high-level integration and low-level control of the render loop ([Rive Web JS runtime](https://rive.app/docs/runtimes/web/web-js)).

Its React runtime supports simple `<Rive />` usage and advanced `useRive` control, including mouse events, text updates, event subscriptions, and state-machine playback ([Rive React runtime](https://rive.app/docs/runtimes/react/react)).

That makes Rive especially good for **interactive vector UI elements** rather than full app-world choreography ([Rive React runtime](https://rive.app/docs/runtimes/react/react), [Rive Web JS runtime](https://rive.app/docs/runtimes/web/web-js)).

### Best use cases for your project

- Premium loading states and startup sequences ([Rive React runtime](https://rive.app/docs/runtimes/react/react)).
- Ambient HUD components, icons, control surfaces, or status modules driven by state machines ([Rive Web JS runtime](https://rive.app/docs/runtimes/web/web-js), [Rive React runtime](https://rive.app/docs/runtimes/react/react)).
- Button hovers and attention cues with a more authored feel than CSS or plain Motion ([Rive React runtime](https://rive.app/docs/runtimes/react/react)).
- Small looping ambient effects that should stay crisp on all sizes because they are vector/canvas-rendered ([Rive Web JS runtime](https://rive.app/docs/runtimes/web/web-js)).

### Performance and package variants

Rive offers different runtime packages, including **WebGL2**, **canvas**, and **canvas-lite**, and the React docs recommend `@rive-app/react-webgl2` for full renderer benefits while `react-canvas-lite` is the smaller option with reduced features ([Rive React runtime](https://rive.app/docs/runtimes/react/react)).

The web docs also note `@rive-app/canvas-lite` as a smaller package if you do not need Rive Text or Rive Audio ([Rive Web JS runtime](https://rive.app/docs/runtimes/web/web-js)).

Bundlephobia search results show `@rive-app/canvas@2.32.0` at **133.3 kB minified / 38.4 kB gzip**, while the `@rive-app/react-webgl2` package page title lists **154.8 kB minified / 45.0 kB gzip** ([Bundlephobia @rive-app/canvas search result](https://bundlephobia.com/package/@rive-app/canvas@2.32.0), [Bundlephobia @rive-app/react-webgl2](https://bundlephobia.com/package/@rive-app/react-webgl2)).

### Next.js compatibility

Rive’s React runtime is straightforward to embed in React apps and is therefore workable in Next.js client components, although you need to ensure the canvas has size and avoid unnecessary unmount/remount cycles that restart playback ([Rive React runtime](https://rive.app/docs/runtimes/react/react)).

### Rive vs Lottie

The strongest documented differentiation from the material gathered here is that **Rive has explicit state-machine-driven interactivity and runtime control**, while the dotLottie web docs we pulled emphasize player/platform support but do not surface comparable interactivity details in the extracted content ([Rive Web JS runtime](https://rive.app/docs/runtimes/web/web-js), [Rive React runtime](https://rive.app/docs/runtimes/react/react), [dotLottie web docs](https://developers.lottiefiles.com/docs/dotlottie-player/dotlottie-web/)).

That means Rive looks better suited for **interactive UI logic**, whereas Lottie/dotLottie remains stronger as a transport/player format for canned animation assets ([Rive React runtime](https://rive.app/docs/runtimes/react/react), [dotLottie web docs](https://developers.lottiefiles.com/docs/dotlottie-player/dotlottie-web/)).

Bundlephobia lists `@lottiefiles/dotlottie-web` at **315.6 kB minified**, and the extracted export analysis surfaces **33.2 kB gzip for `DotLottie`** and **24.2 kB gzip for `DotLottieWorker`** ([Bundlephobia @lottiefiles/dotlottie-web](https://bundlephobia.com/package/@lottiefiles/dotlottie-web)).

### Verdict on Rive

**Use Rive for premium interactive vector modules, not as the main page-transition engine.** ([Rive React runtime](https://rive.app/docs/runtimes/react/react), [Rive Web JS runtime](https://rive.app/docs/runtimes/web/web-js)).

It is a strong complement to GSAP and Motion in an immersive Next.js stack ([Rive React runtime](https://rive.app/docs/runtimes/react/react), [GSAP React guide](https://gsap.com/resources/React/), [Motion for React](https://motion.dev/docs/react)).

---

## 5) CSS-only approaches in 2025/2026

### What modern CSS can now do

The CSS scroll-driven animations module lets animations run against a **scroll-based timeline** rather than the default document timeline, including root scroll, container scroll, and named timelines ([MDN scroll-driven animations guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)).

The View Transition API enables animated transitions between website views in both SPAs and MPAs and is framed by MDN as a way to reduce cognitive load and perceived latency ([MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)).

`@starting-style` enables transitions on initial render and when elements change from `display: none` to visible, which is especially useful for popovers, dialogs, DOM insertion, and entry/exit patterns ([MDN @starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style)).

### How far pure CSS can go

Pure CSS can now cover **a lot of premium product UI territory**: reveal animations, section progress indicators, parallax-like scroll coupling, popovers/dialog transitions, and some full-page view transitions ([MDN scroll-driven animations guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations), [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API), [MDN @starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style)).

For immersive sites, CSS is strongest when the motion is **structural and browser-native** rather than a deeply sequenced scene graph ([MDN scroll-driven animations guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations), [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)).

### Where CSS still stops short

The collected docs do not show CSS providing an equivalent to GSAP’s pin/scrub/snap/timeline orchestration model or Motion’s interruptible shared-layout system ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [GSAP Timeline docs](https://gsap.com/docs/v3/GSAP/Timeline/), [Motion layout animations](https://motion.dev/docs/react-layout-animations)).

Motion’s own comparison argues the View Transitions API is non-interruptible, blocks pointer events, handles only one screen-wide animation at a time, and struggles with nested relative animation and scroll deltas compared with Motion’s layout system ([Motion layout animations](https://motion.dev/docs/react-layout-animations)).

MDN’s scroll-driven animations guide also implies the need for `@supports` fallback behavior because not all browsers support the feature set ([MDN scroll-driven animations guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)).

### Verdict on CSS-only

**Use CSS as a force multiplier, not as the only immersive layer.** ([MDN scroll-driven animations guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations), [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API), [MDN @starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style)).

A modern immersive stack should take the browser-native wins where possible, then escalate to Motion, GSAP, or WebGL only where the experience truly needs it ([Motion for React](https://motion.dev/docs/react), [GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)).

---

## 6) Motion One / Theatre.js / newer alternatives

### Motion One / Motion for JavaScript ecosystem

The Motion docs position the library across JavaScript, React, and Vue and note that it used to be known as Framer Motion ([Motion docs overview](https://motion.dev/docs)).

For your use case, the meaningful takeaway is that **Motion remains the best “React-native premium UI motion” option in this set**, not a replacement for GSAP’s scroll-cinema dominance ([Motion for React](https://motion.dev/docs/react), [Motion layout animations](https://motion.dev/docs/react-layout-animations), [GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)).

### Theatre.js

Theatre.js is an animation/choreography tool that works with any front-end framework, includes syncing with audio, supports extensions and keyboard shortcuts, and is conceptually aimed at authoring motion timelines ([Theatre.js overview](https://www.theatrejs.com/docs/latest)).

That makes it interesting for **directorial choreography and authored sequencing**, especially in experimental 3D work, but the official material gathered here is much thinner than what GSAP provides for production scroll/app integration ([Theatre.js overview](https://www.theatrejs.com/docs/latest), [GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)).

Bundlephobia lists `@theatre/core` at **97.7 kB minified / 30.7 kB gzip** ([Bundlephobia @theatre/core](https://bundlephobia.com/package/@theatre/core)).

### Worth considering?

**Motion:** yes, for UI. ([Motion for React](https://motion.dev/docs/react)).

**Theatre.js:** worth exploring if you want a more authored, timeline-editor-style workflow for specific sequences, but I would still default to GSAP first for a production immersive Next.js app unless your team already prefers Theatre-style tooling ([Theatre.js overview](https://www.theatrejs.com/docs/latest), [GSAP React guide](https://gsap.com/resources/React/)).

---

## Comparative evaluation table

| Tool | Realism capability | Performance posture | Bundle signal | Next.js 16 fit | Learning curve | Best role |
|---|---|---|---|---|---|---|
| Remotion | High for authored cinematic video; low-to-medium for live app worlds ([Remotion fundamentals](https://www.remotion.dev/docs/the-fundamentals), [Remotion Player landing page](https://www.remotion.dev/player)) | Good for previews/rendering workflows, but framed around video composition and rendering pipelines ([Remotion Player landing page](https://www.remotion.dev/player), [Using @remotion/renderer in Next.js](https://www.remotion.dev/docs/miscellaneous/nextjs)) | 121.9 kB / 38.6 kB gzip ([Bundlephobia remotion](https://bundlephobia.com/package/remotion)) | Works with Next.js templates and installs, but renderer setup is trickier ([Installing Remotion in an existing project](https://www.remotion.dev/docs/brownfield), [Using @remotion/renderer in Next.js](https://www.remotion.dev/docs/miscellaneous/nextjs)) | Medium | Programmatic video creation, previews, render-to-video apps |
| Motion for React | High for premium UI; medium for full cinematic world-building ([Motion for React](https://motion.dev/docs/react), [Motion layout animations](https://motion.dev/docs/react-layout-animations)) | Hybrid WAAPI/JS engine, transform-based layout anims ([Motion for React](https://motion.dev/docs/react), [Motion layout animations](https://motion.dev/docs/react-layout-animations)) | 125.1 kB / 41.6 kB gzip ([Bundlephobia motion](https://bundlephobia.com/package/motion)) | Strong fit in client-side React components ([Motion for React](https://motion.dev/docs/react)) | Low-to-medium | Page transitions, shared-element flows, premium app motion |
| GSAP | Very high, especially with WebGL/Three.js pairing ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [Awwwards Noomo ValenTime case study](https://www.awwwards.com/noomo-valentime-immersive-storytelling-about-love.html)) | Highly optimized scroll/timeline model with up-front calculations ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)) | 68.8 kB / 26.6 kB gzip; React hook tiny ([Bundlephobia gsap](https://bundlephobia.com/package/gsap), [Bundlephobia @gsap/react](https://bundlephobia.com/package/@gsap/react)) | Explicit SSR/Next.js-safe guidance ([GSAP React guide](https://gsap.com/resources/React/)) | Medium-to-high | Primary immersive sequencing engine |
| Rive | Medium-to-high for polished vector interactivity, not full scene worlds ([Rive React runtime](https://rive.app/docs/runtimes/react/react), [Rive Web JS runtime](https://rive.app/docs/runtimes/web/web-js)) | Multiple runtime variants including WebGL2 and lite canvas ([Rive React runtime](https://rive.app/docs/runtimes/react/react), [Rive Web JS runtime](https://rive.app/docs/runtimes/web/web-js)) | Search result shows canvas 133.3 kB / 38.4 kB gzip; react-webgl2 page title shows 154.8 kB / 45.0 kB gzip ([Bundlephobia @rive-app/canvas search result](https://bundlephobia.com/package/@rive-app/canvas@2.32.0), [Bundlephobia @rive-app/react-webgl2](https://bundlephobia.com/package/@rive-app/react-webgl2)) | Good client-component fit; watch mount/size handling ([Rive React runtime](https://rive.app/docs/runtimes/react/react)) | Medium | Interactive vector UI, loaders, ambient HUDs |
| CSS modern APIs | Medium for product/UI immersion; lower for full cinematic worlds ([MDN scroll-driven animations guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations), [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)) | Browser-native where supported ([MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API), [MDN @starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style)) | Minimal incremental JS cost ([MDN scroll-driven animations guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)) | Excellent when progressively enhanced ([MDN scroll-driven animations guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)) | Medium, mostly due to browser quirks | Lightweight transitions and native effects |
| Theatre.js | Potentially high for authored choreography, but less proven here for production immersive app scaffolding ([Theatre.js overview](https://www.theatrejs.com/docs/latest)) | Not enough evidence from gathered docs to rate above “promising” ([Theatre.js overview](https://www.theatrejs.com/docs/latest)) | 97.7 kB / 30.7 kB gzip ([Bundlephobia @theatre/core](https://bundlephobia.com/package/@theatre/core)) | Likely workable because framework-agnostic ([Theatre.js overview](https://www.theatrejs.com/docs/latest)) | Medium-to-high | Authored animation choreography experiments |

---

## What the best immersive sites actually use

## 5–10 examples and stack signals

### 1) Noomo ValenTime

Awwwards’ case study describes Noomo ValenTime as an immersive 3D experience with a magical world, a continuous cinematic camera path, scroll-triggered animation, baked Blender animation, and real-time rendering techniques ([Awwwards Noomo ValenTime case study](https://www.awwwards.com/noomo-valentime-immersive-storytelling-about-love.html)).

The technology stack is explicitly listed as **Three.js (WebGPU & TSL), Blender, Houdini, Microsoft Maquette, GSAP, React, Vercel, and WebGPU** ([Awwwards Noomo ValenTime case study](https://www.awwwards.com/noomo-valentime-immersive-storytelling-about-love.html)).

This is the clearest evidence in the set that elite immersive work tends to pair **real-time 3D + GSAP + React**, not Remotion and not CSS alone ([Awwwards Noomo ValenTime case study](https://www.awwwards.com/noomo-valentime-immersive-storytelling-about-love.html)).

### 2) J-Vers

The Awwwards J-Vers case study says the frontend was built with **Next.js**, and specifically names **React Three Fiber, Three.js, GSAP, and Tailwind CSS** as key frontend libraries ([Awwwards J-Vers case study](https://www.awwwards.com/case-study-j-vers-site.html)).

The write-up says GSAP handled **scroll-triggered animations and entrance transitions**, while R3F and Three.js handled the 3D scene and camera logic ([Awwwards J-Vers case study](https://www.awwwards.com/case-study-j-vers-site.html)).

This is almost a blueprint for your use case because it combines **Next.js + 3D + GSAP** for cinematic entry and navigation ([Awwwards J-Vers case study](https://www.awwwards.com/case-study-j-vers-site.html)).

### 3) Working Stiff Films

Awwwards search results for the case study say **GSAP powered all animations using clean, DOM-based timelines**, and the tech used includes **Next.js (App Router), React, and GSAP (ScrollTrigger + ...)** ([Awwwards Working Stiff Films case study search result](https://www.awwwards.com/working-stiff-films-case-study.html)).

Even without the full article fetched, that is another direct signal that premium cinematic brand sites commonly use **Next.js + GSAP** for their motion stack ([Awwwards Working Stiff Films case study search result](https://www.awwwards.com/working-stiff-films-case-study.html)).

### 4) Medal of Honor: Above & Beyond

The Awwwards page describes it as an immersive site that brings the **3D feeling of Oculus VR gaming to 2D surfaces** and gives it an **Animations / Transitions score of 9.33/10** in the DEV award breakdown ([Awwwards Medal of Honor page](https://www.awwwards.com/sites/medal-of-honor-above-beyond)).

A related Awwwards inspiration result tags the experience with **webgl, storytelling, threejs, react, 360, parallax, and scrolling** ([Awwwards inspiration search result for Medal of Honor](https://www.awwwards.com/inspiration/scroll-to-navigate-3d-feeling-of-oculus-vr-gaming-to-2d-surfaces-medal-of-honor)).

### 5) Lawted – Immersive 3D Story

The Awwwards result describes Lawted as an immersive 3D portfolio built with **React Three Fiber & Spline** ([Awwwards Lawted page](https://www.awwwards.com/sites/lawted-immersive-3d-story), [Awwwards search result for Lawted](https://www.awwwards.com/sites/lawted-immersive-3d-story)).

That again points toward the immersive pattern being **real-time 3D scene tech first**, with UI animation libraries layered around it ([Awwwards search result for Lawted](https://www.awwwards.com/sites/lawted-immersive-3d-story)).

### 6) Le Voyage Azarien

An Awwwards inspiration result describes this as an immersive experience with morphing particles and 3D scene scans, built with **webgl, storytelling, three-js, react, glsl, and 3d** ([Awwwards inspiration result for Le Voyage Azarien](http://www.awwwards.com:8080/inspiration/le-voyage-azarien-immersive-experience-with-morphing-particles-3d-scans-of-scenes)).

That stack emphasizes shaders and scene rendering, not page-transition libraries alone ([Awwwards inspiration result for Le Voyage Azarien](http://www.awwwards.com:8080/inspiration/le-voyage-azarien-immersive-experience-with-morphing-particles-3d-scans-of-scenes)).

### 7) Penderecki’s Garden

Awwwards’ article on the project says the experience used **photogrammetry**, **GLSL shaders** for particle motion, **Web Audio API**, and a lot of work on smooth transitions and accessibility layers ([Awwwards Penderecki’s Garden article](https://www.awwwards.com/pendereckis-garden-by-huncwot.html)).

That suggests the most advanced immersive experiences are often built as **custom rendering systems plus motion orchestration**, not by leaning on a single React motion library ([Awwwards Penderecki’s Garden article](https://www.awwwards.com/pendereckis-garden-by-huncwot.html)).

### 8) Foam Talent 2021 Digital Exhibition

Awwwards’ immersive WebGL exhibitions article says the exhibition used **animation library for React and Framer Motion** for image-reveal and layout-specific motion ([Awwwards immersive WebGL exhibitions article](https://www.awwwards.com/immersive-webgl-virtual-gallery-exhibition-collection.html)).

This is one of the better examples of where **Framer Motion/Motion is used effectively in immersive-adjacent work**, especially when the experience is still more layout/media-oriented than full scene-world oriented ([Awwwards immersive WebGL exhibitions article](https://www.awwwards.com/immersive-webgl-virtual-gallery-exhibition-collection.html)).

### 9) 20 Years of Xbox Museum

Awwwards’ immersive exhibitions article describes it as a **microverse** with six custom 3D environments and real-time avatars on Active Theory’s Dreamwave platform ([Awwwards immersive WebGL exhibitions article](https://www.awwwards.com/immersive-webgl-virtual-gallery-exhibition-collection.html)).

Again, the defining stack characteristic is **real-time 3D environment tooling**, not a pure DOM animation library ([Awwwards immersive WebGL exhibitions article](https://www.awwwards.com/immersive-webgl-virtual-gallery-exhibition-collection.html)).

### 10) 3D WebGPU ArchiViz

An Awwwards search result describes this site as **immersive WebGPU architecture visualization with high-end realism, rich post-processing, and unmatched performance — all under 6MB** ([Awwwards search result for 3D WebGPU ArchiViz](https://www.awwwards.com/sites/3d-webgpu-archiviz)).

The signal here is that the frontier of “luxury game-like” web work is moving toward **WebGPU / advanced rendering**, with motion libraries serving as orchestration layers rather than doing the heavy visual lifting alone ([Awwwards search result for 3D WebGPU ArchiViz](https://www.awwwards.com/sites/3d-webgpu-archiviz)).

## Pattern across winners

Across these examples, the recurring stack is **Three.js / React Three Fiber / WebGL or WebGPU for the world**, **GSAP for sequencing and scroll transitions**, and **React/Next.js for app structure**, with Motion or similar tools appearing more often in UI- and media-oriented experiences than in the most technically cinematic ones ([Awwwards Noomo ValenTime case study](https://www.awwwards.com/noomo-valentime-immersive-storytelling-about-love.html), [Awwwards J-Vers case study](https://www.awwwards.com/case-study-j-vers-site.html), [Awwwards immersive WebGL exhibitions article](https://www.awwwards.com/immersive-webgl-virtual-gallery-exhibition-collection.html), [Awwwards Penderecki’s Garden article](https://www.awwwards.com/pendereckis-garden-by-huncwot.html)).

---

## Final recommendation

If the goal is an immersive Next.js 16 interface that feels like a luxury video game, I would choose the stack below in this order of importance ([Awwwards J-Vers case study](https://www.awwwards.com/case-study-j-vers-site.html), [Awwwards Noomo ValenTime case study](https://www.awwwards.com/noomo-valentime-immersive-storytelling-about-love.html)):

1. **GSAP + ScrollTrigger as the main sequencing system** for cinematic transitions, floor-to-floor movement, scrubbed scenes, pinning, and orchestration ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [GSAP Timeline docs](https://gsap.com/docs/v3/GSAP/Timeline/)).
2. **Three.js / React Three Fiber** for any world-like background, camera path, atmospheric scene, volumetric/foggy mood, or shader-driven luxury aesthetic, following the pattern used by the strongest immersive sites in the research set ([Awwwards Noomo ValenTime case study](https://www.awwwards.com/noomo-valentime-immersive-storytelling-about-love.html), [Awwwards J-Vers case study](https://www.awwwards.com/case-study-j-vers-site.html)).
3. **Motion for React** for app-shell transitions, shared-element navigation, overlays, modals, and high-polish UI animation inside React state ([Motion for React](https://motion.dev/docs/react), [Motion layout animations](https://motion.dev/docs/react-layout-animations)).
4. **Rive** for interactive vector assets and ambient UI loops ([Rive React runtime](https://rive.app/docs/runtimes/react/react)).
5. **Modern CSS APIs** for progressive enhancement and lower-cost motion where they fit naturally ([MDN scroll-driven animations guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations), [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API), [MDN @starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style)).

**I would not use Remotion as the core engine** for this particular project unless a major requirement is programmatic video generation or rendered cinematic previews ([Remotion docs](https://www.remotion.dev/docs/), [Remotion Player landing page](https://www.remotion.dev/player)).

## Short answer by tool

- **Remotion:** Great for programmatic video; wrong default choice for live immersive app backgrounds ([Remotion docs](https://www.remotion.dev/docs/), [Remotion Player landing page](https://www.remotion.dev/player)).
- **Motion for React:** Excellent for premium UI transitions and layout choreography; not the deepest scroll-cinema engine ([Motion for React](https://motion.dev/docs/react), [Motion layout animations](https://motion.dev/docs/react-layout-animations)).
- **GSAP:** Best overall fit for cinematic immersive web motion in Next.js ([GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [GSAP React guide](https://gsap.com/resources/React/)).
- **Rive:** Best for interactive vector polish, loaders, HUDs, and microinteraction systems ([Rive React runtime](https://rive.app/docs/runtimes/react/react)).
- **CSS-only:** Strong support layer, not full replacement for high-end immersive stacks ([MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API), [MDN scroll-driven animations guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)).
- **Theatre.js / newer alternatives:** Interesting, especially for authored choreography, but GSAP remains the safer production default from the evidence gathered here ([Theatre.js overview](https://www.theatrejs.com/docs/latest), [GSAP ScrollTrigger docs](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)).
