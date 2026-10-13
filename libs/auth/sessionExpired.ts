import Router from 'next/router';
import { getJwtToken, removeJwtToken } from './token';

/** How long after an expiry a guard that sends the visitor to login still adds `reason=expired`. */
const NOTICE_WINDOW_MS = 10000;
/** Operations where UNAUTHENTICATED means "wrong credentials", not "your session ended". */
export const SESSION_FREE_OPERATIONS = new Set(['Login', 'SignupUser', 'SignupOrganizer']);

let expiredAt = 0;
let endSession: () => void = removeJwtToken;

/** libs/auth/index.ts registers `clearSession` here (it imports the Apollo client, which imports this file). */
export const registerSessionEnd = (fn: () => void) => {
	endSession = fn;
};

/** True just after the session ended on its own: the guard that redirects to login then adds `reason=expired`. */
export const sessionJustExpired = () => Date.now() - expiredAt < NOTICE_WINDOW_MS;

/** A new sign-in clears the notice. */
export const resetSessionExpired = () => {
	expiredAt = 0;
};

const onAuthPage = () => {
	const path = Router.pathname || '';
	return path === '/account/login' || path === '/account/signup';
};

/**
 * The one place that ends a session whose token the server no longer accepts or that has passed its own `exp`:
 * token removed, `userVar` cleared, cache reset (`resetStore`, F296), `authReadyVar` stays true. The page guard
 * (`useRequireAuth`) then does the single redirect to login, with returnTo and `reason=expired`; public pages just
 * become signed out. Does nothing without a stored token, so a guest, the sign-in page and requests that fail after
 * the session already ended are ignored. `sentToken` is the token the failed request carried: a request from an
 * older session cannot end a newer one.
 */
export function handleSessionExpired(sentToken?: string) {
	const token = getJwtToken();
	if (!token) return;
	if (sentToken && sentToken !== token) return;
	// On the sign-in and sign-up pages there is nobody to tell: just drop the dead token.
	if (typeof window !== 'undefined' && !onAuthPage()) expiredAt = Date.now();
	endSession();
}
