import React, { ElementType, HTMLAttributes, useCallback, useEffect, useRef } from 'react';
import useIsomorphicLayoutEffect from '../../hooks/useIsomorphicLayoutEffect';

type Props = HTMLAttributes<HTMLElement> & {
	/** The scrolling element (default `div`; use `ul` for a list of tabs). Give it `overflow-x: auto` in your own class. */
	as?: ElementType;
	/** Changes when the current tab changes; the new current tab is then scrolled into view. */
	activeKey?: string | number | boolean | null;
	/** What marks the current tab inside the strip. */
	activeSelector?: string;
	children: React.ReactNode;
};

const FADE_AT = 2;

/**
 * Edge fade for a horizontally scrolling strip (tabs, chips). The strip itself is the scroller: it gets `tz-fade`, a fade
 * shows only on the side that still has content (`data-fade-start`, `data-fade-end`, styles in `scss/layout.scss`), and
 * the current tab is scrolled into view without moving the page. Nothing here changes the layout, so there is no shift.
 * Usage and rules: docs/ai/UI_PATTERNS.md.
 */
const ScrollFade = ({
	as: Tag = 'div',
	activeKey,
	activeSelector = '[aria-current="page"], [aria-selected="true"], [aria-pressed="true"], .is-active',
	className,
	children,
	...rest
}: Props) => {
	const ref = useRef<HTMLElement>(null);
	const frame = useRef(0);
	const first = useRef(true);

	const measure = useCallback(() => {
		const el = ref.current;
		if (!el) return;
		const start = el.scrollLeft > FADE_AT;
		const end = el.scrollLeft + el.clientWidth < el.scrollWidth - FADE_AT;
		el.toggleAttribute('data-fade-start', start);
		el.toggleAttribute('data-fade-end', end);
	}, []);

	const schedule = useCallback(() => {
		cancelAnimationFrame(frame.current);
		frame.current = requestAnimationFrame(measure);
	}, [measure]);

	// Current tab into view: instant on the first paint, smooth after that (instant under reduced motion)
	useIsomorphicLayoutEffect(() => {
		const el = ref.current;
		const current = el?.querySelector<HTMLElement>(activeSelector);
		if (el && current && el.scrollWidth > el.clientWidth) {
			const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			const left = current.offsetLeft - (el.clientWidth - current.offsetWidth) / 2;
			el.scrollTo({ left: Math.max(0, left), behavior: first.current || reduce ? 'auto' : 'smooth' });
		}
		first.current = false;
		measure();
	}, [activeKey, activeSelector, measure]);

	useEffect(() => {
		const el = ref.current;
		if (!el) return undefined;
		el.addEventListener('scroll', schedule, { passive: true });
		const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
		observer?.observe(el);
		Array.from(el.children).forEach((child) => observer?.observe(child));
		window.addEventListener('resize', schedule);
		return () => {
			el.removeEventListener('scroll', schedule);
			observer?.disconnect();
			window.removeEventListener('resize', schedule);
			cancelAnimationFrame(frame.current);
		};
	}, [schedule]);

	return (
		<Tag ref={ref} className={`tz-fade${className ? ` ${className}` : ''}`} {...rest}>
			{children}
		</Tag>
	);
};

export default ScrollFade;
