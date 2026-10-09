import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

const DURATION = 600;

/**
 * A number that counts up from 0 once, the first time it has a real value. Later changes (a refetch) jump straight
 * to the new value. With reduced motion, or off-screen server render, it shows the final value at once.
 * `format` turns the running number into the text (number or money formatting stays with the caller).
 */
const CountUp = ({ value, format }: { value: number; format: (value: number) => string }) => {
	const [shown, setShown] = useState(value);
	const played = useRef(false);

	useEffect(() => {
		if (played.current || !Number.isFinite(value) || value <= 0) {
			setShown(value);
			return undefined;
		}
		// nobody sees a background tab, and its frames do not run: show the number
		if (prefersReducedMotion() || document.visibilityState !== 'visible') {
			played.current = true;
			setShown(value);
			return undefined;
		}
		let frame = 0;
		const start = performance.now();
		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / DURATION);
			const eased = 1 - Math.pow(1 - t, 3);
			setShown(Math.round(value * eased));
			if (t < 1) frame = requestAnimationFrame(tick);
			else played.current = true;
		};
		setShown(0);
		frame = requestAnimationFrame(tick);
		// frames do not run in a background tab: the timer makes sure the real number always ends up on screen
		const done = window.setTimeout(() => {
			played.current = true;
			setShown(value);
		}, DURATION + 100);
		return () => {
			cancelAnimationFrame(frame);
			window.clearTimeout(done);
		};
	}, [value]);

	return <>{format(shown)}</>;
};

export default CountUp;
