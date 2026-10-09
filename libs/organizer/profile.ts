import { AVATAR_MAX_BYTES, avatarProblem } from '../account/profile';

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

export type OrgProfileErrors = Partial<Record<keyof OrgProfileValues, 'fullName' | 'nick' | 'desc' | 'phone' | 'address'>>;

const len = (value: string) => Array.from(value.trim()).length;

/**
 * Same limits as the server (`MemberUpdate`: full name 3 to 100, nickname 3 to 12 characters). An organizer always has a
 * public name, and the server cannot clear either name (an empty string fails its length rule), so both are required here.
 */
export function validateOrgProfile(values: OrgProfileValues): OrgProfileErrors {
	const errors: OrgProfileErrors = {};
	if (len(values.memberFullName) < 3 || len(values.memberFullName) > 100) errors.memberFullName = 'fullName';
	if (len(values.memberNick) < 3 || len(values.memberNick) > 12) errors.memberNick = 'nick';
	if (len(values.memberDesc) > DESC_MAX) errors.memberDesc = 'desc';
	if (values.memberPhone.trim() && !/^\+?[0-9][0-9\s().-]{5,18}$/.test(values.memberPhone.trim())) errors.memberPhone = 'phone';
	if (len(values.memberAddress) > ADDRESS_MAX) errors.memberAddress = 'address';
	return errors;
}
