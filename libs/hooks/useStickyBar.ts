import { useEffect } from 'react';

/**
 * Tells the rest of the page that a sticky bottom bar (`.tz-bar`) is mounted and whether it is on screen right now.
 * `html[data-bar]` gives the footer room for the bar; `html[data-bar-shown]` lifts the Ask Ticketzy button above it.
 * Both are set on the root element so no other component has to know about the bar. See docs/ai/UI_PATTERNS.md.
 */
export default function useStickyBar(shown: boolean) {
	useEffect(() => {
		const root = document.documentElement;
		root.dataset.bar = '';
		return () => {
			delete root.dataset.bar;
		};
	}, []);

	useEffect(() => {
		if (!shown) return undefined;
		const root = document.documentElement;
		root.dataset.barShown = '';
		return () => {
			delete root.dataset.barShown;
		};
	}, [shown]);
}
