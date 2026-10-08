/** Client-side checks for the profile form. The server checks again (nickname 3 to 12, full name 3 to 100 characters). */
export const AVATAR_TYPES = ['image/png', 'image/jpeg'] as const;
/** The server accepts 15 MB; avatars are small, so 5 MB is a friendlier limit. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export type AvatarProblem = 'type' | 'size';

export function avatarProblem(file: Pick<File, 'type' | 'size'>): AvatarProblem | null {
	if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'type';
	if (file.size > AVATAR_MAX_BYTES) return 'size';
	return null;
}

const len = (value: string) => Array.from(value.trim()).length;

export interface ProfileValues {
	memberFullName: string;
	memberNick: string;
	memberPhone: string;
}

export type ProfileErrors = Partial<Record<keyof ProfileValues, 'fullName' | 'nick' | 'phone'>>;

export function validateProfile(values: ProfileValues): ProfileErrors {
	const errors: ProfileErrors = {};
	if (values.memberFullName.trim() && (len(values.memberFullName) < 3 || len(values.memberFullName) > 100)) errors.memberFullName = 'fullName';
	if (values.memberNick.trim() && (len(values.memberNick) < 3 || len(values.memberNick) > 12)) errors.memberNick = 'nick';
	if (values.memberPhone.trim() && !/^\+?[0-9][0-9\s().-]{5,18}$/.test(values.memberPhone.trim())) errors.memberPhone = 'phone';
	return errors;
}
