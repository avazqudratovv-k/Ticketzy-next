import { AVATAR_MAX_BYTES, avatarProblem, PHONE_FORMAT } from '../account/profile';
import { FieldIssues, lengthRule } from '../fieldErrors';

export { AVATAR_MAX_BYTES, avatarProblem };

export const DESC_MAX = 1000;
export const ADDRESS_MAX = 200;

/** What the organizer edits. `memberEmail` is shown but cannot change (`MemberUpdate` has no such field). */
export interface OrgProfileValues {
	memberFullName: string;
	memberNick: string;
	memberDesc: string;
	memberPhone: string;
	memberAddress: string;
}

/** Client-only rule names for the two texts the server does not limit. */
export const DESC_TOO_LONG = 'descTooLong';
export const ADDRESS_TOO_LONG = 'addressTooLong';

const len = (value: string) => Array.from(value.trim()).length;

/**
 * Same limits as the server (`MemberUpdate`: full name 3 to 100, nickname 3 to 50 characters, F348). An organizer always has a
 * public name, and the server cannot clear either name (an empty string fails its length rule), so both are required here.
 * Issues are keyed by backend property name; the rule names are the ones the server sends.
 */
export function validateOrgProfile(values: OrgProfileValues): FieldIssues {
	const issues: FieldIssues = {};
	const fullName = lengthRule('memberFullName', values.memberFullName);
	if (fullName) issues.memberFullName = fullName;
	const nick = lengthRule('memberNick', values.memberNick);
	if (nick) issues.memberNick = nick;
	if (len(values.memberDesc) > DESC_MAX) issues.memberDesc = DESC_TOO_LONG;
	if (values.memberPhone.trim() && !/^\+?[0-9][0-9\s().-]{5,18}$/.test(values.memberPhone.trim())) issues.memberPhone = PHONE_FORMAT;
	if (len(values.memberAddress) > ADDRESS_MAX) issues.memberAddress = ADDRESS_TOO_LONG;
	return issues;
}
