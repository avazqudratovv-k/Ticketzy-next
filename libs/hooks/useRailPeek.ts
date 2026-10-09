import { RefObject, useEffect } from 'react';
import { prefersReducedMotion } from './usePrefersReducedMotion';

const DISTANCE = 64;
const LEG_MS = 450;
const PAUSE_MS = 150;
const VISIBLE = 0.6;

/** Rows that already peeked in this page load (by key), so a re-mount or a client-side return does not repeat it. */
const peeked = new Set<string>();

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

/**
 * One-time hint that a row scrolls sideways: when the row is first at least 60% visible it slides about 64 px and
 * returns, once. Any touch, hover, focus, key, wheel or scroll by the visitor cancels it for good; reduced motion, a
 * row with nothing to scroll and a row that is not at its start skip it. Only `scrollLeft` of the track changes (snap
 * is switched off for the duration and restored), so the page, focus and layout stay put and nothing is announced.
 */
export default function useRailPeek(rail: RefObject<HTMLElement>, track: RefObject<HTMLElement>, key: string) {
	useEffect(() => {
		const root = rail.current;
		const el = track.current;
		if (!root || !el || peeked.has(key) || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return undefined;

		let frame = 0;
		let timer = 0;
		let running = false;
		let expected = 0;
		const sign = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
		const events = ['pointerdown', 'pointerenter', 'touchstart', 'wheel', 'focusin', 'keydown', 'click'] as const;

		const stop = () => {
			cancelAnimationFrame(frame);
			window.clearTimeout(timer);
			if (running) el.style.removeProperty('scroll-snap-type');
			running = false;
		};
		const dismiss = () => {
			peeked.add(key);
			stop();
			observer.disconnect();
			events.forEach((name) => root.removeEventListener(name, dismiss));
			el.removeEventListener('scroll', onScroll);
		};
		// a scroll we did not write is the visitor's (rounding to device pixels stays under 2 px)
		const onScroll = () => {
			if (running && Math.abs(el.scrollLeft - expected) > 2) dismiss();
		};

		const animate = (from: number, to: number, done: () => void) => {
			const start = performance.now();
			const step = (now: number) => {
				const p = Math.min(1, (now - start) / LEG_MS);
				expected = (from + (to - from) * easeOut(p)) * sign;
				el.scrollLeft = expected;
				if (p < 1) frame = requestAnimationFrame(step);
				else done();
			};
			frame = requestAnimationFrame(step);
		};

		const run = () => {
			peeked.add(key);
			observer.disconnect();
			// nothing to scroll, already moved, or the pointer is already resting on the row
			if (el.scrollWidth - el.clientWidth <= DISTANCE || Math.abs(el.scrollLeft) > 0 || root.matches(':hover') || root.contains(document.activeElement)) {
				dismiss();
				return;
			}
			running = true;
			el.style.scrollSnapType = 'none';
			animate(0, DISTANCE, () => {
				timer = window.setTimeout(
					() =>
						animate(DISTANCE, 0, () => {
							running = false;
							el.style.removeProperty('scroll-snap-type');
							dismiss();
						}),
					PAUSE_MS,
				);
			});
		};

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.intersectionRatio >= VISIBLE)) run();
			},
			{ threshold: [VISIBLE] },
		);
		observer.observe(el);
		events.forEach((name) => root.addEventListener(name, dismiss, { passive: true }));
		el.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			stop();
			observer.disconnect();
			events.forEach((name) => root.removeEventListener(name, dismiss));
			el.removeEventListener('scroll', onScroll);
		};
	}, [rail, track, key]);
}
