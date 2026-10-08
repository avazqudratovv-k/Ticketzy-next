import { useEffect } from 'react';
import { clearSession, getJwtToken, isExpired } from '../auth';

/**
 * Seat and order calls can sit open for minutes, and the seat map ignores a bad token (it is a public query), so an
 * expired session would otherwise look like a quiet "your hold ended". Checking the token's own expiry every few
 * seconds ends the session at once; the page guard then sends the buyer to login with returnTo.
 */
export function useSessionWatch(enabled = true) {
	useEffect(() => {
		if (!enabled) return undefined;
		const check = () => {
			const token = getJwtToken();
			if (!token || isExpired(token)) clearSession();
		};
		const id = window.setInterval(check, 5000);
		window.addEventListener('focus', check);
		return () => {
			window.clearInterval(id);
			window.removeEventListener('focus', check);
		};
	}, [enabled]);
}
