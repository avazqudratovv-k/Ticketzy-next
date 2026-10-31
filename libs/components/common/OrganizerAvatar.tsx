import InitialsAvatar from './InitialsAvatar';

interface Person {
	memberNick?: string | null;
	memberFullName?: string | null;
	memberImage?: string | null;
}

/** Avatar for any public member (organizer, commenter): the logo or photo, or the letters of the name when there is none. */
const OrganizerAvatar = ({ member, size = 40, className }: { member: Person; size?: number; className?: string }) => (
	<InitialsAvatar src={member.memberImage} name={member.memberFullName || member.memberNick || ''} size={size} className={className} />
);

export default OrganizerAvatar;
