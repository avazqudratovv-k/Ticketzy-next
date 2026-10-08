import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

/**
 * Warns before the page is left with unsaved changes: closing or reloading the tab (the browser's own prompt) and
 * in-app navigation (a confirm). `allowNextRoute()` lets the caller's own redirect through, for example after the
 * first save moves the page from /new to /[id]/edit.
 */
export default function useUnsavedGuard(dirty: boolean, message: string) {
	const router = useRouter();
	const allow = useRef(false);

	useEffect(() => {
		if (!dirty) return undefined;
		const onUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = '';
		};
		const onRoute = (url: string) => {
			if (allow.current) {
				allow.current = false;
				return;
			}
			// Same page (a step change in the query string): nothing is lost
			const target = url.split('?')[0].replace(/\/$/, '');
			const here = router.asPath.split('?')[0].replace(/\/$/, '');
			if (target === here) return;
			if (!window.confirm(message)) {
				router.events.emit('routeChangeError');
				// Next.js stops the navigation when a routeChangeStart handler throws this string
				// eslint-disable-next-line no-throw-literal
				throw 'Route change aborted: unsaved changes.';
			}
		};
		window.addEventListener('beforeunload', onUnload);
		router.events.on('routeChangeStart', onRoute);
		return () => {
			window.removeEventListener('beforeunload', onUnload);
			router.events.off('routeChangeStart', onRoute);
		};
	}, [dirty, message, router]);

	return { allowNextRoute: () => { allow.current = true; } };
}
