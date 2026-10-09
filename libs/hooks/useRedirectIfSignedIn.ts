import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import useAuth from './useAuth';
import { homeFor, safeReturnTo } from '../routes';

/**
 * On the login and signup pages: a member who opens the page while already signed in goes to the home of their role
 * (buyer /, organizer /organizer, admin /admin). A member who signs in on the page goes to returnTo when there is one.
 */
export default function useRedirectIfSignedIn(suppress = false) {
	const router = useRouter();
	const { user, ready } = useAuth();
	// Whether a session existed when the stored session was first checked: then returnTo is not honoured.
	const alreadySignedIn = useRef<boolean | null>(null);
	if (ready && alreadySignedIn.current === null) alreadySignedIn.current = Boolean(user);

	useEffect(() => {
		if (!ready || !user || suppress || !router.isReady) return;
		router.replace((!alreadySignedIn.current && safeReturnTo(router.query.returnTo)) || homeFor(user));
	}, [ready, user, suppress, router]);
}
