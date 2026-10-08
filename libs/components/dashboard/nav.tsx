import React from 'react';
import {
	Icon,
	ChartBar,
	MapPin,
	CheckCircle,
	CreditCard,
	Calendar,
	EnvelopeSimple,
	FileText,
	Receipt,
	Scan,
	Shield,
	Sliders,
	SquaresFour,
	Tag,
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
			{ href: '/admin/queue', label: 'dashboard.nav.reviewQueue', icon: icon(CheckCircle) },
			{ href: '/admin/events', label: 'dashboard.nav.allEvents', icon: icon(Calendar) },
			{ href: '/admin/organizers', label: 'dashboard.nav.organizers', icon: icon(Users) },
			{ href: '/admin/messages', label: 'dashboard.nav.messages', icon: icon(EnvelopeSimple) },
		],
	},
	{
		title: 'dashboard.groups.money',
		items: [
			{ href: '/admin/orders', label: 'dashboard.nav.orders', icon: icon(Receipt) },
			{ href: '/admin/refunds', label: 'dashboard.nav.refunds', icon: icon(CreditCard) },
		],
	},
	{
		title: 'dashboard.groups.platform',
		items: [
			{ href: '/admin/users', label: 'dashboard.nav.users', icon: icon(User) },
			{ href: '/admin/catalog', label: 'dashboard.nav.catalog', icon: icon(Tag) },
			{ href: '/admin/settings', label: 'dashboard.nav.settings', icon: icon(Sliders) },
		],
	},
];

export const ADMIN_FOOT: NavItem = { href: '/admin/audit', label: 'dashboard.auditLog', icon: icon(FileText) };
export const ADMIN_BADGE_ICON = <Shield size={14} aria-hidden />;
