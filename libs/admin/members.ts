import { MemberStatus, MemberType } from '../enums/member.enum';

export const MEMBER_TYPE_FILTERS = ['all', 'user', 'organizer', 'admin'] as const;
export type MemberTypeFilter = (typeof MEMBER_TYPE_FILTERS)[number];
export const isMemberTypeFilter = (value: string): value is MemberTypeFilter => (MEMBER_TYPE_FILTERS as readonly string[]).includes(value);
export const memberTypeOf = (filter: MemberTypeFilter): MemberType | null => (filter === 'all' ? null : (filter.toUpperCase() as MemberType));

export const MEMBER_STATUS_FILTERS = ['all', 'pending', 'active', 'rejected', 'suspended', 'delete'] as const;
export type MemberStatusFilter = (typeof MEMBER_STATUS_FILTERS)[number];
export const isMemberStatusFilter = (value: string): value is MemberStatusFilter => (MEMBER_STATUS_FILTERS as readonly string[]).includes(value);
export const memberStatusOf = (filter: MemberStatusFilter): MemberStatus | null => (filter === 'all' ? null : (filter.toUpperCase() as MemberStatus));

/** Sorts `getAllMembersByAdmin` accepts (availableMemberSorts). */
export const MEMBER_SORTS = {
	newest: { sort: 'createdAt', direction: 'DESC' },
	oldest: { sort: 'createdAt', direction: 'ASC' },
	updated: { sort: 'updatedAt', direction: 'DESC' },
} as const;
export type MemberSortKey = keyof typeof MEMBER_SORTS;
export const isMemberSortKey = (value: string): value is MemberSortKey => value in MEMBER_SORTS;

export const MEMBERS_PAGE_SIZE = 10;

export type MemberAction = 'suspend' | 'reactivate';

/**
 * What the UI offers on a member. The only write is `updateMemberByAdmin` with a `memberStatus`, and only for buyers (USER):
 * - organizers have their own audited operations (the backend answers USE_ORGANIZER_OPERATIONS otherwise),
 * - ADMIN accounts are never changed here, and an admin can never change their own account.
 */
export function memberActionFor(member: { _id: string; memberType: MemberType; memberStatus: MemberStatus }, selfId?: string | null): {
	action: MemberAction | null;
	locked: 'self' | 'admin' | 'organizer' | 'status' | null;
} {
	if (selfId && member._id === selfId) return { action: null, locked: 'self' };
	if (member.memberType === MemberType.ADMIN) return { action: null, locked: 'admin' };
	if (member.memberType === MemberType.ORGANIZER) return { action: null, locked: 'organizer' };
	if (member.memberStatus === MemberStatus.ACTIVE) return { action: 'suspend', locked: null };
	if (member.memberStatus === MemberStatus.SUSPENDED) return { action: 'reactivate', locked: null };
	return { action: null, locked: 'status' };
}
