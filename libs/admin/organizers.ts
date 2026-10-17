import { MemberStatus } from '../enums/member.enum';

/** Tabs of the organizer list. The URL stores the lowercase tab; `approved` is the backend status ACTIVE. */
export const ORGANIZER_TABS = ['pending', 'approved', 'rejected', 'suspended', 'all'] as const;
export type OrganizerTab = (typeof ORGANIZER_TABS)[number];
export const isOrganizerTab = (value: string): value is OrganizerTab => (ORGANIZER_TABS as readonly string[]).includes(value);
export const organizerTabStatus = (tab: OrganizerTab): MemberStatus | null =>
	tab === 'all' ? null : tab === 'approved' ? MemberStatus.ACTIVE : (tab.toUpperCase() as MemberStatus);
export const organizerCountKey = (tab: OrganizerTab) => (tab === 'all' ? 'ALL' : tab === 'approved' ? 'ACTIVE' : tab.toUpperCase());

/** Sorts `getOrganizersByAdmin` accepts (availableOrganizerSorts). */
export const ORGANIZER_SORTS = {
	newest: { sort: 'createdAt', direction: 'DESC' },
	oldest: { sort: 'createdAt', direction: 'ASC' },
	likes: { sort: 'memberLikes', direction: 'DESC' },
	views: { sort: 'memberViews', direction: 'DESC' },
} as const;
export type OrganizerSortKey = keyof typeof ORGANIZER_SORTS;
export const isOrganizerSortKey = (value: string): value is OrganizerSortKey => value in ORGANIZER_SORTS;

export const ORGANIZERS_PAGE_SIZE = 10;

/**
 * Which actions the backend allows from each status (organizerTransitions, DECISIONS #31):
 * verify and reject from PENDING, suspend from ACTIVE, reinstate from SUSPENDED or REJECTED.
 */
export const organizerActions = (status: MemberStatus) => ({
	approve: status === MemberStatus.PENDING,
	reject: status === MemberStatus.PENDING,
	suspend: status === MemberStatus.ACTIVE,
	reinstate: status === MemberStatus.SUSPENDED || status === MemberStatus.REJECTED,
});
