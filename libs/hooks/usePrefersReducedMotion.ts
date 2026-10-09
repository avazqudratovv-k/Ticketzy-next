/** True when the visitor asked for less motion. Read on demand (no state): callers use it inside effects. */
export const prefersReducedMotion = (): boolean =>
	typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
