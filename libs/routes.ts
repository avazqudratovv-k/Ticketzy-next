import { MemberProfile } from './types/member';
import { MemberType } from './enums/member.enum';
import { safeReturnTo } from './safeReturnTo';

export const ROUTES = {
	home: '/',
	events: '/events',
	orders: '/orders',
	tickets: '/tickets',
	notifications: '/notifications',
	saved: '/account/saved',
	settings: '/settings',
	login: '/account/login',
	signup: '/account/signup',
	forgotPassword: '/forgot-password',
	resetPassword: '/reset-password',
	verifyEmail: '/verify-email',
	sell: '/sell',
	contact: '/contact',
	organizerDashboard: '/organizer',
	adminDashboard: '/admin',
} as const;

/** Where a member lands after signing in when no returnTo is given. */
export const homeFor = (user: Pick<MemberProfile, 'memberType'>): string => {
	if (user.memberType === MemberType.ADMIN) return ROUTES.adminDashboard;
	if (user.memberType === MemberType.ORGANIZER) return ROUTES.organizerDashboard;
	return ROUTES.home;
};

export { safeReturnTo };

/** `reason=expired` makes the login page say the session ended (libs/auth/sessionExpired.ts). */
export const loginUrl = (returnTo?: string, reason?: 'expired') => {
	const params = [returnTo ? `returnTo=${encodeURIComponent(returnTo)}` : '', reason ? `reason=${reason}` : ''].filter(Boolean);
	return params.length ? `${ROUTES.login}?${params.join('&')}` : ROUTES.login;
};

export const eventUrl = (id: string) => `/events/${id}`;
export const seatsUrl = (id: string) => `/events/${id}/seats`;
export const organizerUrl = (id: string) => `/organizers/${id}`;
export const checkoutUrl = (orderId: string) => `/checkout/${orderId}`;
export const confirmationUrl = (orderId: string) => `/orders/${orderId}/confirmation`;
export const orderUrl = (id: string) => `/orders/${id}`;
export const ticketUrl = (id: string) => `/tickets/${id}`;

export const organizerEventsUrl = '/organizer/events';
export const organizerEventNewUrl = '/organizer/events/new';
export const organizerEventEditUrl = (id: string) => `/organizer/events/${id}/edit`;

export const organizerEventOrdersUrl = (id: string) => `/organizer/events/${id}/orders`;
export const organizerCheckInUrl = '/organizer/check-in';
export const organizerProfileUrl = '/organizer/profile';

export const organizerVenuesUrl = '/organizer/venues';
export const organizerVenueNewUrl = '/organizer/venues/new';
export const organizerVenueEditUrl = (id: string) => `/organizer/venues/${id}`;

/** A page of the event form may send the organizer to the venue form and ask to be sent back: only organizer event pages are accepted. */
export const safeEventReturn = (value: string | string[] | undefined): string | null => {
	const path = safeReturnTo(value);
	return path && /^\/organizer\/events\/(new|[^/?#]+\/edit)(\?[^#]*)?$/.test(path) ? path : null;
};

/** The return address with the chosen venue added, so the event form can pick it. */
export const withVenue = (path: string, venueId: string) => `${path}${path.includes('?') ? '&' : '?'}venueId=${encodeURIComponent(venueId)}`;
