import { useEffect } from 'react';
import { useRouter } from 'next/router';
import useAuth from './useAuth';
import { homeFor, safeReturnTo } from '../routes';

/** On the login and signup pages: a signed-in member goes to returnTo, or to the home of their role. */
export default function useRedirectIfSignedIn(suppress = false) {
	const router = useRouter();
	const { user, ready } = useAuth();

	useEffect(() => {
		if (!ready || !user || suppress || !router.isReady) return;
		router.replace(safeReturnTo(router.query.returnTo) ?? homeFor(user));
	}, [ready, user, suppress, router]);
}
