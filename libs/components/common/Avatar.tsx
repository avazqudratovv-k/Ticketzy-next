import InitialsAvatar from './InitialsAvatar';
import { MemberProfile } from '../../types/member';

export const displayName = (user: MemberProfile): string =>
	user.memberFullName || user.memberNick || user.memberEmail || '';

/** Profile photo when the member has one, initials otherwise (design: avatar in the top bar). */
const Avatar = ({ user, size = 40 }: { user: MemberProfile; size?: number }) => <InitialsAvatar src={user.memberImage} name={displayName(user)} size={size} />;

export default Avatar;
