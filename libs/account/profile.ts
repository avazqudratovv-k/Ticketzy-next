/** Client-side checks for the profile form. The server checks again (nickname 3 to 50, full name 3 to 100 characters, F348). */
import { FieldIssues, lengthRule } from '../fieldErrors';


export const AVATAR_TYPES = ['image/png', 'image/jpeg'] as const;
/** The server accepts 15 MB; avatars are small, so 5 MB is a friendlier limit. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export type AvatarProblem = 'type' | 'size';

export function avatarProblem(file: Pick<File, 'type' | 'size'>): AvatarProblem | null {
	if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'type';
	if (file.size > AVATAR_MAX_BYTES) return 'size';
	return null;
}

export interface ProfileValues {
	memberFullName: string;
	memberNick: string;
	memberPhone: string;
}

/** Client-only rule name for a phone number that is not made of digits; the server has no phone rule. */
export const PHONE_FORMAT = 'phoneFormat';

/** Issues by backend property name; the rule names are the ones the server sends (`isLength`), so the messages are shared. */
export function validateProfile(values: ProfileValues): FieldIssues {
	const issues: FieldIssues = {};
	const fullName = lengthRule('memberFullName', values.memberFullName, false);
	if (fullName) issues.memberFullName = fullName;
	const nick = lengthRule('memberNick', values.memberNick, false);
	if (nick) issues.memberNick = nick;
	if (values.memberPhone.trim() && !/^\+?[0-9][0-9\s().-]{5,18}$/.test(values.memberPhone.trim())) issues.memberPhone = PHONE_FORMAT;
	return issues;
}
