import { useReactiveVar } from '@apollo/client';
import { authReadyVar, userVar } from '../../apollo/store';
import { MemberStatus, MemberType } from '../enums/member.enum';

export default function useAuth() {
	const user = useReactiveVar(userVar);
	const ready = useReactiveVar(authReadyVar);
	return {
		user,
		/** False until the stored session has been checked once. */
		ready,
		isLoggedIn: Boolean(user),
		isPendingOrganizer: user?.memberType === MemberType.ORGANIZER && user.memberStatus === MemberStatus.PENDING,
	};
}
