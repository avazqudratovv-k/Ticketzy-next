import { MemberType } from './enums/member.enum';
import { MemberProfile } from './types/member';

/** Only buyer accounts (USER) can buy. Organizer and admin accounts are refused by the backend as well. */
export const isBlockedBuyer = (user: Pick<MemberProfile, 'memberType'> | null | undefined): boolean =>
	Boolean(user) && user?.memberType !== MemberType.USER;

/** The backend's own refusal text (Message.ONLY_BUYERS_CAN_BUY). Matched in libs/seats/errors.ts. */
export const BUYER_ONLY_API_MESSAGE = 'Only buyer accounts can buy tickets! Organizer and admin accounts cannot.';

/**
 * A page that sends a blocked member away (seats, checkout) leaves the message here; the page they land on shows it
 * once. Module state is enough: the redirect is a client-side navigation inside the same document.
 */
let pendingNotice = false;
export const queueBuyerNotice = () => {
	pendingNotice = true;
};
export const takeBuyerNotice = (): boolean => {
	const had = pendingNotice;
	pendingNotice = false;
	return had;
};
