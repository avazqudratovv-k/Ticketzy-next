import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

/**
 * For the pages opened from an emailed link (`/verify-email?token=`, `/reset-password?token=`): reads the one-time token
 * from the address once, then takes it out of the address bar and the history entry right away (`history.replaceState`),
 * so it is not left in the browser history, a copied address or a screenshot. It lives in component state only.
 * The router is told too (shallow, no fetch), otherwise a language switch would put the old address back.
 * The token is never logged. `ready` is false until the first read, `token` is null for a link without one.
 */
export default function useLinkToken(): { ready: boolean; token: string | null } {
	const router = useRouter();
	const [state, setState] = useState<{ ready: boolean; token: string | null }>({ ready: false, token: null });

	// React's development double-run of effects would read the address a second time, after the token is gone
	const read = useRef(false);

	useEffect(() => {
		if (read.current) return;
		read.current = true;
		const params = new URLSearchParams(window.location.search);
		const found = params.get('token');
		setState({ ready: true, token: found && found.trim() ? found.trim() : null });
		if (window.location.search) {
			window.history.replaceState(window.history.state, '', window.location.pathname);
			router.replace(router.pathname, undefined, { shallow: true, scroll: false }).catch(() => undefined);
		}
		// Once, on arrival: the effect must not run again when the router object changes
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return state;
}
