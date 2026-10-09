import { useEffect, useState } from 'react';
import { pendingStore, WAKE_NOTE_AFTER_MS } from '../../apollo/resilience';

/** The note is shown once per page load (per document), never again after it has been shown and dismissed. */
let shown = false;

/**
 * True once a request has been pending for about 4 seconds while the page is still on a skeleton (`aria-busy` in
 * the main area), until nothing is pending. The production backend sleeps and can take up to a minute to answer.
 * Requests are tracked in one place (the Apollo link), so every page gets the note without wiring it in.
 */
export default function useWakeNote(): boolean {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const check = () => {
			const since = pendingStore.oldest();
			if (since === null) {
				setVisible(false);
				return;
			}
			if (shown) return;
			if (Date.now() - since < WAKE_NOTE_AFTER_MS) return;
			if (!document.querySelector('main [aria-busy="true"]')) return;
			shown = true;
			setVisible(true);
		};
		const unsubscribe = pendingStore.subscribe(check);
		const timer = window.setInterval(check, 500);
		return () => {
			unsubscribe();
			window.clearInterval(timer);
		};
	}, []);

	return visible;
}
