import { TFunction } from 'next-i18next';
import { ApiError, VALIDATION_FAILED } from './errors';

/**
 * Per-field validation: the server's `VALIDATION_FAILED` answer (`fields: [{ field, rules }]`) and the client checks that run
 * before the request both end as the same thing, a backend property name and a class-validator rule name, so they show the
 * same sentence. Forms keep their issues keyed by the backend property name (`memberNick`) and render `fieldMessage`.
 */

/** Limits of the backend inputs (`MemberInput`, `MemberUpdate`, read from the backend DTOs). Only fields with a limit are listed. */
export const FIELD_LIMITS: Record<string, { min?: number; max?: number }> = {
	memberNick: { min: 3, max: 50 },
	memberFullName: { min: 3, max: 100 },
	memberPassword: { min: 8 },
};

/** Not a class-validator rule: the issue the sign-up form gives the email field for `EMAIL_RECENTLY_DELETED` (backend #124). */
export const RECENTLY_DELETED_RULE = 'emailRecentlyDeleted';

/** Property name -> rule, for one form. */
export type FieldIssues = Partial<Record<string, string>>;

/**
 * The server counts UTF-16 units (class-validator `Length`), so the client does too; the value is trimmed because the forms
 * send it trimmed. An empty optional value is fine, an empty required one is `isNotEmpty`.
 */
export function lengthRule(field: string, value: string, required = true): string | null {
	const { min, max } = FIELD_LIMITS[field] ?? {};
	const length = value.trim().length;
	if (length === 0) return required ? 'isNotEmpty' : null;
	if (min !== undefined && length < min) return max !== undefined ? 'isLength' : 'minLength';
	if (max !== undefined && length > max) return min !== undefined ? 'isLength' : 'maxLength';
	return null;
}

/** The sentence for one failed rule of one field (namespace `common`, keys `validation.*`). Unknown rules get the generic one. */
export function fieldMessage(t: TFunction, field: string, rule: string): string {
	const { min, max } = FIELD_LIMITS[field] ?? {};
	switch (rule.toLowerCase()) {
		case 'isnotempty':
		case 'isdefined':
			return t('common:validation.required');
		case 'isemail':
			return t('common:validation.email');
		case RECENTLY_DELETED_RULE.toLowerCase():
			return t('common:validation.emailRecentlyDeleted');
		case 'islength':
		case 'length':
			if (min !== undefined && max !== undefined) return t('common:validation.between', { min, max });
			if (min !== undefined) return t('common:validation.tooShort', { min });
			if (max !== undefined) return t('common:validation.tooLong', { max });
			break;
		case 'minlength':
			if (min !== undefined) return t('common:validation.tooShort', { min });
			break;
		case 'maxlength':
			if (max !== undefined) return t('common:validation.tooLong', { max });
			break;
		case 'min':
			if (min !== undefined) return t('common:validation.tooSmall', { min });
			break;
		case 'max':
			if (max !== undefined) return t('common:validation.tooBig', { max });
			break;
		default:
	}
	return t('common:validation.invalid');
}

export interface ServerIssues {
	/** the first failed rule of every field the form has an input for */
	issues: Record<string, string>;
	/** true when the generic banner is still needed: no `fields`, or a field the form has no input for */
	banner: boolean;
}

/**
 * Splits a failed call into inline issues and the banner. `known` are the backend property names the form shows an input for.
 * Errors that are not `VALIDATION_FAILED` (wrong password, already used, network) are never inline: they keep the banner.
 */
export function serverIssues(error: ApiError, known: readonly string[]): ServerIssues {
	const issues: Record<string, string> = {};
	if (error.code !== VALIDATION_FAILED || !error.fields) return { issues, banner: true };
	let unknown = false;
	error.fields.forEach(({ field, rules }) => {
		if (known.includes(field)) issues[field] ??= rules[0] ?? 'invalid';
		else unknown = true;
	});
	return { issues, banner: unknown || Object.keys(issues).length === 0 };
}
