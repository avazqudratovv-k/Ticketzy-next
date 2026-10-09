import { ReactNode, useRef } from 'react';
import { prefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import useIsomorphicLayoutEffect from '../../hooks/useIsomorphicLayoutEffect';

/**
 * A section that fades and rises once when it scrolls into view. The server markup and the first render are fully
 * visible; only after hydration, and only for a section that starts below the fold, the attribute `data-reveal="hidden"`
 * is set on the DOM node (no React state, no re-render) and an IntersectionObserver switches it to "shown" once.
 * Without JavaScript, without IntersectionObserver, or with reduced motion nothing is ever hidden.
 */
const Reveal = ({ children, ...rest }: { children: ReactNode } & React.HTMLAttributes<HTMLElement>) => {
	const ref = useRef<HTMLElement>(null);

	useIsomorphicLayoutEffect(() => {
		const node = ref.current;
		if (!node || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return undefined;
		if (node.getBoundingClientRect().top < window.innerHeight) return undefined;
		node.dataset.reveal = 'hidden';
		const observer = new IntersectionObserver(
			(entries) => {
				// also a section already scrolled past (restored scroll position, fast jump): nobody sees it animate
				if (!entries.some((entry) => entry.isIntersecting || entry.boundingClientRect.bottom <= 0)) return;
				node.dataset.reveal = 'shown';
				observer.disconnect();
			},
			{ rootMargin: '0px 0px -10% 0px' },
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	return (
		<section ref={ref} {...rest}>
			{children}
		</section>
	);
};

export default Reveal;
