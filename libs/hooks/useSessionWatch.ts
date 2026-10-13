import { useEffect } from 'react';
import { getJwtToken, isExpired } from '../auth';
import { handleSessionExpired } from '../auth/sessionExpired';

/**
 * Mounted once in `_app` while a member is signed in (F338). Seat and order calls can sit open for minutes, and the
 * seat map ignores a bad token (it is a public query), so an expired session would otherwise look like a quiet "your
 * hold ended". Checking the token's own expiry every few seconds ends the session at once; the page guard then sends
 * the member to login with returnTo and the expired message.
 */
export function useSessionWatch(enabled = true) {
	useEffect(() => {
		if (!enabled) return undefined;
		const check = () => {
			const token = getJwtToken();
			if (token && isExpired(token)) handleSessionExpired();
		};
		const id = window.setInterval(check, 5000);
		window.addEventListener('focus', check);
		return () => {
			window.clearInterval(id);
			window.removeEventListener('focus', check);
		};
	}, [enabled]);
}
