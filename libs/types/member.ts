import { MemberStatus, MemberType } from '../enums/member.enum';

/** The fields of the `Member` GraphQL type the client keeps for the signed-in member (see MEMBER_FIELDS). */
export interface MemberProfile {
	_id: string;
	memberType: MemberType;
	memberStatus: MemberStatus;
	memberEmail?: string | null;
	memberPhone?: string | null;
	memberNick?: string | null;
	memberFullName?: string | null;
	memberImage: string;
	memberAddress?: string | null;
	memberDesc?: string | null;
	rejectReason?: string | null;
	/** False until the emailed link is opened (backend #135); undefined only for a profile loaded by an older API */
	emailVerified?: boolean;
	/** The language of the emails sent to the member (`en`, `ko`, `ru`, `uz` in the API's enum as EN, KO, RU, UZ) */
	memberLang?: 'EN' | 'KO' | 'RU' | 'UZ' | null;
	createdAt: string;
}

/** Inputs of `signupUser` and `signupOrganizer` (`MemberInput`). */
export interface SignupInput {
	memberEmail: string;
	memberPassword: string;
	memberNick?: string;
	memberPhone?: string;
	memberFullName?: string;
	/** The interface language at sign-up, so the confirmation email arrives in it */
	memberLang?: 'EN' | 'KO' | 'RU' | 'UZ';
}
