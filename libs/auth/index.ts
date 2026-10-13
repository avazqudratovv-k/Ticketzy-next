import decodeJWT from 'jwt-decode';
import { initializeApollo } from '../../apollo/client';
import { authReadyVar, userVar } from '../../apollo/store';
import { LOGIN, SIGNUP_ORGANIZER, SIGNUP_USER } from '../../apollo/user/mutation';
import { GET_MEMBER } from '../../apollo/user/query';
import { MemberProfile, SignupInput } from '../types/member';
import { parseApiError } from '../errors';
import { getJwtToken, removeJwtToken, setJwtToken } from './token';
import { handleSessionExpired, registerSessionEnd, resetSessionExpired } from './sessionExpired';

export { getJwtToken } from './token';

/** The token carries only these two claims (backend DECISIONS #25). */
interface TokenClaims {
	_id: string;
	memberType: string;
	exp?: number;
}

interface TokenResult {
	_id: string;
	accessToken: string;
}

export const isExpired = (token: string): boolean => {
	try {
		const { exp } = decodeJWT<TokenClaims>(token);
		return typeof exp === 'number' && exp * 1000 <= Date.now();
	} catch {
		return true;
	}
};

/** Loads the profile with the stored token. Throws the parsed API error when the call fails. */
async function loadProfile(memberId: string): Promise<MemberProfile> {
	const client = initializeApollo();
	try {
		const { data } = await client.query({
			query: GET_MEMBER,
			variables: { memberId },
			fetchPolicy: 'network-only',
		});
		return data.getMember as MemberProfile;
	} catch (err) {
		throw parseApiError(err);
	}
}

/** Stores the token, loads the profile and publishes it. A failed profile load leaves nothing half signed in. */
async function startSession({ _id, accessToken }: TokenResult): Promise<MemberProfile> {
	setJwtToken(accessToken);
	resetSessionExpired();
	try {
		const profile = await loadProfile(_id);
		userVar(profile);
		refreshActiveQueries();
		return profile;
	} catch (err) {
		clearSession();
		throw err;
	}
}

export async function logIn(memberEmail: string, memberPassword: string): Promise<MemberProfile> {
	const client = initializeApollo();
	let result: TokenResult;
	try {
		const { data } = await client.mutate({
			mutation: LOGIN,
			variables: { input: { memberEmail: memberEmail.trim().toLowerCase(), memberPassword } },
		});
		result = data.login;
	} catch (err) {
		throw parseApiError(err);
	}
	return startSession(result);
}

/** Creates the account and signs the new member in (the signup mutations return a token). */
export async function signUp(role: 'USER' | 'ORGANIZER', input: SignupInput): Promise<MemberProfile> {
	const client = initializeApollo();
	const payload: SignupInput = { ...input, memberEmail: input.memberEmail.trim().toLowerCase() };
	let result: TokenResult;
	try {
		const { data } = await client.mutate({
			mutation: role === 'ORGANIZER' ? SIGNUP_ORGANIZER : SIGNUP_USER,
			variables: { input: payload },
		});
		result = role === 'ORGANIZER' ? data.signupOrganizer : data.signupUser;
	} catch (err) {
		throw parseApiError(err);
	}
	return startSession(result);
}

/** Runs once on load (and when another tab signs in or out): token in storage -> profile in userVar. */
export async function restoreSession(): Promise<void> {
	const token = getJwtToken();
	if (!token || isExpired(token)) {
		// A stored token that has run out ends the session like any other expiry (message on a guarded page).
		if (token) handleSessionExpired();
		userVar(null);
		authReadyVar(true);
		return;
	}
	resetSessionExpired();
	try {
		const { _id } = decodeJWT<TokenClaims>(token);
		userVar(await loadProfile(_id));
	} catch (err) {
		const { code } = parseApiError(err);
		// Only a rejected token ends the session; a network blip keeps it for the next load.
		if (code === 'UNAUTHENTICATED' || code === 'FORBIDDEN' || code === 'BAD_REQUEST') {
			handleSessionExpired();
			clearSession();
		}
	} finally {
		authReadyVar(true);
	}
}

/**
 * Queries on screen were sent with the old identity (or none). They are fetched again, never dropped: `clearStore()`
 * cancels the requests in flight and re-sends nothing, which left pages on their skeleton until a manual refresh.
 */
function refreshActiveQueries() {
	initializeApollo()
		.refetchQueries({ include: 'active' })
		.catch(() => undefined);
}

/** One reset at a time: a second sign-out while the first one is still refetching waits for it. */
let resetting: Promise<unknown> = Promise.resolve();

/**
 * Empties the cache of the previous member and fetches every active query again (`resetStore`, not `clearStore`).
 * The requests cancelled by the reset are the ones sent again, so nothing stays in loading.
 */
function resetCache() {
	resetting = resetting.then(() => initializeApollo().resetStore()).catch(() => undefined);
}

/** Drops the token and the profile and the cached data of the previous member. No page reload. */
export function clearSession() {
	removeJwtToken();
	userVar(null);
	resetCache();
}

export const logOut = clearSession;

registerSessionEnd(clearSession);
