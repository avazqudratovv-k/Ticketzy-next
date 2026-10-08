import { MemberProfile } from '../types/member';
import { MemberStatus, MemberType } from '../enums/member.enum';
import { EventStatus } from '../types/event';

/** Why an organizer can or cannot create and publish events (backend DECISIONS #25: only ACTIVE organizers may write). */
export type OrganizerAccess = 'active' | 'pending' | 'rejected' | 'suspended';

export function organizerAccess(user: Pick<MemberProfile, 'memberType' | 'memberStatus'> | null | undefined): OrganizerAccess | null {
	if (!user || user.memberType !== MemberType.ORGANIZER) return null;
	switch (user.memberStatus) {
		case MemberStatus.ACTIVE:
			return 'active';
		case MemberStatus.PENDING:
			return 'pending';
		case MemberStatus.REJECTED:
			return 'rejected';
		default:
			// SUSPENDED, and DELETE (which the server also refuses at login)
			return 'suspended';
	}
}

export const EVENT_STATUSES: EventStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ENDED'];
export const isEventStatus = (value: unknown): value is EventStatus => (EVENT_STATUSES as unknown[]).includes(value);

/**
 * What the organizer may change in each status (backend DECISIONS #36):
 * `full` = DRAFT and REJECTED, status stays; `review` = APPROVED, any saved change sends the event back to PENDING;
 * `locked` = PENDING, CANCELLED and ENDED answer EVENT_NOT_EDITABLE.
 */
export type EditMode = 'full' | 'review' | 'locked';
export const editModeOf = (status: EventStatus): EditMode =>
	status === 'DRAFT' || status === 'REJECTED' ? 'full' : status === 'APPROVED' ? 'review' : 'locked';

/** Actions a row offers per status. Duplicate and organizer-side cancel do not exist in the backend (see DECISIONS). */
export interface RowActions {
	edit: boolean;
	view: boolean;
	submit: boolean;
	cancel: boolean;
	publicPage: boolean;
}

export function rowActions(status: EventStatus): RowActions {
	return {
		edit: status === 'DRAFT' || status === 'REJECTED' || status === 'APPROVED',
		view: status === 'PENDING' || status === 'CANCELLED' || status === 'ENDED',
		submit: status === 'DRAFT' || status === 'REJECTED',
		cancel: status === 'APPROVED',
		publicPage: status === 'APPROVED',
	};
}

export const SORTS = {
	dateAsc: { sort: 'startAt', direction: 'ASC' },
	dateDesc: { sort: 'startAt', direction: 'DESC' },
	updated: { sort: 'updatedAt', direction: 'DESC' },
	created: { sort: 'createdAt', direction: 'DESC' },
} as const;
export type SortKey = keyof typeof SORTS;
export const isSortKey = (value: unknown): value is SortKey => typeof value === 'string' && value in SORTS;

/** Event dates the list treats as "upcoming": not ended yet. */
export const isUpcoming = (iso: string) => new Date(iso).getTime() > Date.now();
