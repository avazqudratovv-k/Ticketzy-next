import { useCallback, useEffect, useState } from 'react';
import { pendingStore, WAKE_NOTE_AFTER_MS } from '../../apollo/resilience';

/**
 * The demo backend sleeps on a free host and can take up to a minute to answer. The note is wanted while a query has
 * been pending for about 5 seconds, or after a query ended without an answer (network error, timeout, 5xx), and until
 * the next query is answered. Requests are tracked in one place (the Apollo link), so no page is wired by hand.
 * Closing the note keeps it closed until the trouble is over; a later episode shows it again.
 */
export default function useWakeNote(): { visible: boolean; dismiss: () => void } {
	const [trouble, setTrouble] = useState(false);
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		const check = () => {
			const since = pendingStore.oldest();
			const slow = since !== null && Date.now() - since >= WAKE_NOTE_AFTER_MS;
			const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
			const next = slow || (pendingStore.unreachable() && !offline);
			setTrouble(next);
			if (!next) setDismissed(false);
		};
		// A query can start while another component renders (useQuery), so the state is set after that render, never inside it
		const unsubscribe = pendingStore.subscribe(() => queueMicrotask(check));
		const timer = window.setInterval(check, 500);
		return () => {
			unsubscribe();
			window.clearInterval(timer);
		};
	}, []);

	const dismiss = useCallback(() => setDismissed(true), []);
	return { visible: trouble && !dismissed, dismiss };
}
