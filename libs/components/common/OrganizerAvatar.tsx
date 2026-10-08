import { Avatar as MuiAvatar } from '@mui/material';
import { imageSrc } from '../events/EventImage';

interface Person {
	memberNick?: string | null;
	memberFullName?: string | null;
	memberImage?: string | null;
}

const initialsOf = (name: string) =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => Array.from(part)[0]?.toUpperCase())
		.join('');

/** Avatar for any public member (organizer, commenter): photo, or initials when there is none. */
const OrganizerAvatar = ({ member, size = 40 }: { member: Person; size?: number }) => {
	const name = member.memberFullName || member.memberNick || '';
	return (
		<MuiAvatar src={imageSrc(member.memberImage)} alt="" sx={{ width: size, height: size }}>
			{initialsOf(name) || '?'}
		</MuiAvatar>
	);
};

export default OrganizerAvatar;
