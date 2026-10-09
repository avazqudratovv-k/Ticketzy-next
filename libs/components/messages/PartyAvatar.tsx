import { Avatar } from '@mui/material';
import { MemberType } from '../../enums/member.enum';
import { partyName } from '../../messaging/format';
import { Conversation } from '../../messaging/types';
import { imageSrc } from '../events/EventImage';

const initialsOf = (name: string) =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => Array.from(part)[0]?.toUpperCase())
		.join('');

/** Admin side sees the organizer's photo or initials; the organizer side sees the team as "TZ" (design: OrgMessages). */
const PartyAvatar = ({ conversation, role, size = 40 }: { conversation: Conversation; role: MemberType; size?: number }) => {
	if (role === MemberType.ADMIN) {
		const party = conversation.organizerData;
		return (
			<Avatar src={imageSrc(party?.memberImage)} alt="" sx={{ width: size, height: size }}>
				{initialsOf(partyName(party)) || '?'}
			</Avatar>
		);
	}
	return (
		<Avatar alt="" className="msgs-teamavatar" sx={{ width: size, height: size }}>
			TZ
		</Avatar>
	);
};

export default PartyAvatar;
