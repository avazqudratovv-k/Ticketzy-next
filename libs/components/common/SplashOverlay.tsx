import { CSSProperties, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Logo from './Logo';

/** Total time on screen, counted from mount, before the fade-out starts to remove it. */
const SHOW_MS = 3000;
/** Length of the fade-out (and of the early-dismiss fade); the node is removed after it. */
const LEAVE_MS = 400;
/**
 * Confetti, fixed and computed the same way every time (golden-angle spread, so any first 16 are even too): no randomness.
 * dx/dy: where the burst peaks (px from the logo centre), fall: extra drop, rot: spin, d: start stagger (ms), w: width (px), c: colour (0 to 3).
 */
const BITS = Array.from({ length: 24 }, (_, i) => {
	const angle = ((i * 137.508) % 360) * (Math.PI / 180);
	const radius = 120 + ((i * 53) % 100);
	return {
		dx: Math.round(Math.cos(angle) * radius),
		dy: Math.round(Math.sin(angle) * radius * 0.8 - 40),
		fall: 140 + ((i * 29) % 80),
		rot: ((i * 97) % 720) - 360,
		d: (i * 41) % 260,
		w: 6 + (i % 3) * 2,
		c: i % 4,
	};
});

/**
 * The overlay of PaidSplash (F347) and ApprovalSplash (F352): logo, glow, rings, check badge and confetti over a blurred, dimmed
 * window for about 3 s, then `onEnd`. Decorative: aria-hidden, takes no focus; the page announces the result in its own live region.
 * Click, Escape or Enter dismiss it early. `message` is shown under the logo (visual only, the caller announces it).
 */
const SplashOverlay = ({ message, onEnd }: { message?: string; onEnd: () => void }) => {
	const [phase, setPhase] = useState<'show' | 'leave'>('show');
	// The caller's callback may change on every render; the timers must not restart because of that
	const end = useRef(onEnd);
	end.current = onEnd;

	// Hold, then fade out, then hand back
	useEffect(() => {
		const timer = window.setTimeout(() => (phase === 'show' ? setPhase('leave') : end.current()), phase === 'show' ? SHOW_MS - LEAVE_MS : LEAVE_MS);
		return () => window.clearTimeout(timer);
	}, [phase]);

	// Early dismiss from the keyboard; the key does nothing else while the splash is up
	useEffect(() => {
		if (phase !== 'show') return undefined;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== 'Escape' && event.key !== 'Enter') return;
			event.preventDefault();
			event.stopPropagation();
			setPhase('leave');
		};
		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
	}, [phase]);

	return createPortal(
		<div className={`tz-splash${message ? ' tz-splash--msg' : ''}${phase === 'leave' ? ' is-leaving' : ''}`} aria-hidden="true" onClick={() => setPhase('leave')}>
			<div className="tz-splash__stage">
				<span className="tz-splash__fx tz-splash__glow" />
				<span className="tz-splash__fx tz-splash__ring" />
				<span className="tz-splash__fx tz-splash__ring tz-splash__ring--2" />
				{BITS.map((bit, index) => (
					<span
						key={index}
						className="tz-splash__fx tz-splash__bit"
						data-c={bit.c}
						style={{ '--dx': `${bit.dx}px`, '--dy': `${bit.dy}px`, '--fall': `${bit.fall}px`, '--rot': `${bit.rot}deg`, '--d': `${bit.d}ms`, '--w': `${bit.w}px` } as CSSProperties}
					/>
				))}
				<span className="tz-splash__mark">
					<Logo size={192} className="tz-splash__logo" />
				</span>
				<svg className="tz-splash__badge" viewBox="0 0 32 32" focusable="false">
					<circle cx="16" cy="16" r="15" />
					<path d="M9.5 16.5l4.5 4.5 8.5-9.5" pathLength={1} />
				</svg>
			</div>
			{message && <p className="tz-splash__msg">{message}</p>}
		</div>,
		document.body
	);
};

export default SplashOverlay;
