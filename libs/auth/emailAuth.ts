import { makeVar } from '@apollo/client';
import { initializeApollo } from '../../apollo/client';
import { userVar } from '../../apollo/store';
import {
	REQUEST_EMAIL_CHANGE,
	REQUEST_PASSWORD_RESET,
	RESEND_VERIFICATION_EMAIL,
	RESET_PASSWORD,
	UPDATE_MEMBER,
	VERIFY_EMAIL,
} from '../../apollo/user/mutation';
import { GET_MEMBER } from '../../apollo/user/query';
import { EMAIL_ALREADY_VERIFIED_MESSAGE, EMAIL_CHANGED_MESSAGE, parseApiError } from '../errors';
import { GetMemberData, GetMemberVars } from '../types/queries';
import { MemberProfile } from '../types/member';
import { isLocale } from '../i18n';
import { getJwtToken } from './token';
import { clearSession } from './index';

/**
 * The calls for confirming an email and resetting a password (backend #135). Every one of them returns a message string
 * that the UI does not show: the pages have their own translated sentences. Failures throw the parsed `ApiError`.
 * Tokens are only ever passed through as arguments here: never logged, stored or put in an error.
 */

type MemberLang = NonNullable<MemberProfile['memberLang']>;

/** The API's language enum (`EN`) for an interface language (`en`); anything else is English. */
export const memberLangOf = (locale: string | undefined): MemberLang => (isLocale(locale) ? (locale.toUpperCase() as MemberLang) : 'EN');

async function call<T>(run: () => Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (err) {
		throw parseApiError(err);
	}
}

/** Confirms the address (`verified`) or completes an email change (`changed`). A spent or expired link throws INVALID_OR_EXPIRED_TOKEN. */
export async function verifyEmailToken(token: string): Promise<'verified' | 'changed'> {
	const message = await call(async () => {
		const { data } = await initializeApollo().mutate({ mutation: VERIFY_EMAIL, variables: { token } });
		return data.verifyEmail as string;
	});
	return message === EMAIL_CHANGED_MESSAGE ? 'changed' : 'verified';
}

/** Mails a new confirmation link to the signed-in member. `already` when the address turned out to be confirmed. */
export async function resendVerificationEmail(): Promise<'sent' | 'already'> {
	try {
		await initializeApollo().mutate({ mutation: RESEND_VERIFICATION_EMAIL });
		return 'sent';
	} catch (err) {
		const error = parseApiError(err);
		if (error.message === EMAIL_ALREADY_VERIFIED_MESSAGE) return 'already';
		throw error;
	}
}

/** The link goes to the new address; the current one stays in use until it is opened. */
export const requestEmailChange = (newEmail: string, currentPassword: string) =>
	call(() =>
		initializeApollo().mutate({
			mutation: REQUEST_EMAIL_CHANGE,
			variables: { input: { newEmail: newEmail.trim().toLowerCase(), currentPassword } },
		}),
	);

export const requestPasswordReset = (email: string) =>
	call(() => initializeApollo().mutate({ mutation: REQUEST_PASSWORD_RESET, variables: { email: email.trim().toLowerCase() } }));

/**
 * Sets the new password. The server raises the account's token version, so every older login is refused from now on;
 * a token stored in this browser is dead as well and is dropped here instead of waiting for the first 401.
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
	await call(() => initializeApollo().mutate({ mutation: RESET_PASSWORD, variables: { token, newPassword } }));
	if (getJwtToken()) clearSession();
}

/** Loads the signed-in member again (after the email was confirmed or changed in this or another tab). */
export async function refreshProfile(): Promise<void> {
	const current = userVar();
	if (!current) return;
	try {
		const { data } = await initializeApollo().query<GetMemberData, GetMemberVars>({
			query: GET_MEMBER,
			variables: { memberId: current._id },
			fetchPolicy: 'network-only',
		});
		if (userVar()?._id === current._id) userVar(data.getMember);
	} catch {
		// the banner then stays until the next load
	}
}

/** Keeps the language of the member's emails in step with the interface language. A failure is silent: the switch itself never waits for it. */
export async function syncMemberLang(locale: string): Promise<void> {
	const current = userVar();
	const memberLang = memberLangOf(locale);
	if (!current || current.memberLang === memberLang) return;
	try {
		const { data } = await initializeApollo().mutate({ mutation: UPDATE_MEMBER, variables: { input: { _id: current._id, memberLang } } });
		if (userVar()?._id === current._id) userVar({ ...userVar()!, ...(data.updateMember as MemberProfile) });
	} catch {
		// the next switch tries again
	}
}

/** When the next "resend" is allowed, as a timestamp; shared by the banner, the sign-up panel and the verify page. */
export const RESEND_COOLDOWN_MS = 60_000;
export const resendUntilVar = makeVar(0);
