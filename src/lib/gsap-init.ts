/**
 * gsap-init.ts — centralised GSAP export.
 *
 * Import gsap from here instead of directly from "gsap" so that:
 *  1. Only the GSAP core is bundled (tree-shakeable).
 *  2. We have a single place to register plugins if/when needed.
 *
 * IMPORTANT: Do NOT add ScrollTrigger, Flip, MorphSVG or other heavy plugins
 * here unless they are actually used — each adds significant bundle weight.
 */
import { gsap } from "gsap";

export { gsap };
