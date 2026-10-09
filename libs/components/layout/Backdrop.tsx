import { useRouter } from 'next/router';

/**
 * Pages that get the decorative ticket marks (Next route patterns): home, events list, event detail, public organizer
 * page and the static info pages. Everything else (seats, checkout, tickets, orders, account, settings, sign-in/up/join,
 * organizer and admin panels) stays plain.
 */
export const BACKDROP_ROUTES: readonly string[] = [
	'/',
	'/events',
	'/events/[id]',
	'/organizers/[id]',
	'/about',
	'/faq',
	'/contact',
	'/privacy',
	'/terms',
];

// public/favicon.svg, drawn in its own colours (dark square, lime ticket, notches, divider bars). The faintness comes
// from `opacity` on the element in CSS only, never from a filter, a mask or a one-colour copy.
const Mark = ({ className }: { className: string }) => (
	<svg className={`tz-backdrop__mark ${className}`} viewBox="0 0 512 512" focusable="false">
		<rect width="512" height="512" rx="112" fill="#0a0b0d" />
		<rect x="96" y="160" width="320" height="192" rx="28" fill="#c8f53c" />
		<circle cx="96" cy="256" r="30" fill="#0a0b0d" />
		<circle cx="416" cy="256" r="30" fill="#0a0b0d" />
		<g fill="#0a0b0d">
			<rect x="320" y="184" width="12" height="14" rx="4" />
			<rect x="320" y="212" width="12" height="14" rx="4" />
			<rect x="320" y="240" width="12" height="14" rx="4" />
			<rect x="320" y="268" width="12" height="14" rx="4" />
			<rect x="320" y="296" width="12" height="14" rx="4" />
			<rect x="320" y="324" width="12" height="14" rx="4" />
		</g>
	</svg>
);

// Routes whose bare-page text includes --ink-subtle: the light-theme marks are fainter there (layout.scss, `--soft`).
const SOFT_ROUTES: readonly string[] = ['/events/[id]', '/organizers/[id]'];

/** Two large faint ticket marks behind the page, at 1200 px and wider. Decorative only (CSS: layout.scss). */
const Backdrop = () => {
	const { pathname } = useRouter();
	if (!BACKDROP_ROUTES.includes(pathname)) return null;
	return (
		<div className={`tz-backdrop${SOFT_ROUTES.includes(pathname) ? ' tz-backdrop--soft' : ''}`} aria-hidden="true">
			<Mark className="tz-backdrop__mark--left" />
			<Mark className="tz-backdrop__mark--right" />
		</div>
	);
};

export default Backdrop;
