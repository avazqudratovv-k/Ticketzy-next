import { MemberType } from '../../enums/member.enum';
import { partyName } from '../../messaging/format';
import { Conversation } from '../../messaging/types';
import InitialsAvatar from '../common/InitialsAvatar';

/** Admin side sees the organizer's photo or initials; the organizer side sees the team as "TZ" (design: OrgMessages). */
const PartyAvatar = ({ conversation, role, size = 40 }: { conversation: Conversation; role: MemberType; size?: number }) => {
	if (role === MemberType.ADMIN) {
		const party = conversation.organizerData;
		return <InitialsAvatar src={party?.memberImage} name={partyName(party)} size={size} />;
	}
	return <InitialsAvatar name="TZ" size={size} className="msgs-teamavatar" />;
};

export default PartyAvatar;
