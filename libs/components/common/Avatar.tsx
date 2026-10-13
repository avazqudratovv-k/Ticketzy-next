import { Avatar as MuiAvatar } from '@mui/material';
import { imageSrc } from '../events/EventImage';
import { MemberProfile } from '../../types/member';

export const displayName = (user: MemberProfile): string =>
	user.memberFullName || user.memberNick || user.memberEmail || '';

const initials = (name: string): string =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => Array.from(part)[0]?.toUpperCase())
		.join('');

/** Profile photo when the member has one, initials otherwise (design: avatar in the top bar). */
const Avatar = ({ user, size = 40 }: { user: MemberProfile; size?: number }) => {
	const name = displayName(user);
	const src = imageSrc(user.memberImage);
	return (
		<MuiAvatar src={src} alt="" sx={{ width: size, height: size }}>
			{initials(name) || '?'}
		</MuiAvatar>
	);
};

export default Avatar;
