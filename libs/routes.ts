import { MemberProfile } from './types/member';
import { MemberType } from './enums/member.enum';

export const ROUTES = {
	home: '/',
	events: '/events',
	orders: '/orders',
	login: '/account/login',
	signup: '/account/signup',
	organizerDashboard: '/organizer',
	adminDashboard: '/admin',
} as const;

/** Where a member lands after signing in when no returnTo is given. */
export const homeFor = (user: Pick<MemberProfile, 'memberType'>): string => {
	if (user.memberType === MemberType.ADMIN) return ROUTES.adminDashboard;
	if (user.memberType === MemberType.ORGANIZER) return ROUTES.organizerDashboard;
	return ROUTES.home;
};

/** Only same-site paths are accepted as returnTo, so a crafted link cannot send the member elsewhere. */
export const safeReturnTo = (value: string | string[] | undefined): string | null => {
	const path = Array.isArray(value) ? value[0] : value;
	if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
	return path;
};

export const loginUrl = (returnTo?: string) =>
	returnTo ? `${ROUTES.login}?returnTo=${encodeURIComponent(returnTo)}` : ROUTES.login;

export const eventUrl = (id: string) => `/events/${id}`;
export const seatsUrl = (id: string) => `/events/${id}/seats`;
export const organizerUrl = (id: string) => `/organizers/${id}`;
export const checkoutUrl = (orderId: string) => `/checkout/${orderId}`;
export const confirmationUrl = (orderId: string) => `/orders/${orderId}/confirmation`;
