import React from 'react';
import {
	Icon,
	ChartBar,
	MapPin,
	Percent,
	CheckCircle,
	CreditCard,
	Calendar,
	Receipt,
	Scan,
	Shield,
	Sliders,
	SquaresFour,
	User,
	Users,
	UsersThree,
} from 'phosphor-react';

export interface NavItem {
	href: string;
	/** key in common.json */
	label: string;
	icon: React.ReactNode;
	/** exact match only (the overview pages) */
	exact?: boolean;
}

export interface NavGroup {
	/** key in common.json; omitted for a flat list */
	title?: string;
	items: NavItem[];
}

const icon = (Glyph: Icon) => <Glyph size={20} aria-hidden />;

/**
 * Sidebar items follow the design (OrgDashboard, AdmDashboard). Only the two overview pages exist so far:
 * the other targets are placeholders for the dashboard phases.
 */
export const ORGANIZER_NAV: NavGroup[] = [
	{
		items: [
			{ href: '/organizer', label: 'dashboard.nav.overview', icon: icon(SquaresFour), exact: true },
			{ href: '/organizer/events', label: 'dashboard.nav.events', icon: icon(Calendar) },
			{ href: '/organizer/venues', label: 'dashboard.nav.venues', icon: icon(MapPin) },
			{ href: '/organizer/attendees', label: 'dashboard.nav.attendees', icon: icon(UsersThree) },
			{ href: '/organizer/check-in', label: 'dashboard.nav.checkIn', icon: icon(Scan) },
			{ href: '/organizer/payouts', label: 'dashboard.nav.payouts', icon: icon(CreditCard) },
			{ href: '/organizer/analytics', label: 'dashboard.nav.analytics', icon: icon(ChartBar) },
			{ href: '/organizer/profile', label: 'dashboard.nav.profile', icon: icon(Sliders) },
		],
	},
];

export const ADMIN_NAV: NavGroup[] = [
	{
		title: 'dashboard.groups.moderation',
		items: [
			{ href: '/admin', label: 'dashboard.nav.overview', icon: icon(SquaresFour), exact: true },
			{ href: '/admin/events', label: 'dashboard.nav.eventApprovals', icon: icon(CheckCircle) },
			{ href: '/admin/organizers', label: 'dashboard.nav.organizers', icon: icon(Users) },
		],
	},
	{
		title: 'dashboard.groups.money',
		items: [
			{ href: '/admin/orders', label: 'dashboard.nav.orders', icon: icon(Receipt) },
			{ href: '/admin/commission', label: 'dashboard.nav.commission', icon: icon(Percent) },
		],
	},
	{
		title: 'dashboard.groups.platform',
		items: [{ href: '/admin/members', label: 'dashboard.nav.members', icon: icon(User) }],
	},
];

export const ADMIN_BADGE_ICON = <Shield size={14} aria-hidden />;
