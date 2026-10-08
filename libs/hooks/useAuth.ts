import { useReactiveVar } from '@apollo/client';
import { authReadyVar, userVar } from '../../apollo/store';
import { MemberStatus, MemberType } from '../enums/member.enum';
import { organizerAccess } from '../organizer/events';

export default function useAuth() {
	const user = useReactiveVar(userVar);
	const ready = useReactiveVar(authReadyVar);
	return {
		user,
		/** False until the stored session has been checked once. */
		ready,
		isLoggedIn: Boolean(user),
		/** `active` when an organizer may create events; otherwise why not. null for everyone who is not an organizer. */
		organizerAccess: organizerAccess(user),
		isPendingOrganizer: user?.memberType === MemberType.ORGANIZER && user.memberStatus === MemberStatus.PENDING,
	};
}
