import React, { ComponentType, useEffect } from 'react';
import { useRouter } from 'next/router';
import useAuth from '../hooks/useAuth';
import { MemberType } from '../enums/member.enum';
import { homeFor, loginUrl, ROUTES } from '../routes';

/**
 * Redirects to /account/login?returnTo=<this page> when nobody is signed in, and to the member's own
 * home when their role is not allowed. `allowed` is true only when the page may render.
 */
export function useRequireAuth(roles?: MemberType[]) {
	const router = useRouter();
	const { user, ready } = useAuth();
	const roleOk = !roles || (user ? roles.includes(user.memberType) : false);

	useEffect(() => {
		if (!ready) return;
		if (!user) {
			router.replace(loginUrl(router.asPath));
		} else if (!roleOk) {
			router.replace(homeFor(user) === router.asPath ? ROUTES.home : homeFor(user));
		}
	}, [ready, user, roleOk, router]);

	return { user, ready, allowed: ready && Boolean(user) && roleOk };
}

export const useRequireRole = (...roles: MemberType[]) => useRequireAuth(roles);

/** HOC form: renders nothing until the visitor is allowed in. */
export function withAuth<P extends object>(Component: ComponentType<P>, roles?: MemberType[]) {
	const Guarded = (props: P) => {
		const { allowed } = useRequireAuth(roles);
		return allowed ? <Component {...props} /> : null;
	};
	Guarded.displayName = `withAuth(${Component.displayName || Component.name || 'Component'})`;
	return Guarded;
}
