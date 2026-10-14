import React, { ComponentType, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button, IconButton } from '@mui/material';
import { Plus, X, List, Info, ArrowLeft } from 'phosphor-react';
import { useTranslation } from 'next-i18next';
import { MemberType } from '../../enums/member.enum';
import { useRequireRole } from '../../auth/guards';
import useAuth from '../../hooks/useAuth';
import { useMessagingUnread } from '../../messaging/hooks';
import Brand from '../common/Brand';
import LanguageSwitcher from '../common/LanguageSwitcher';
import ThemeToggle from '../common/ThemeToggle';
import AccountMenu from '../common/AccountMenu';
import NotificationBell from '../notifications/NotificationBell';
import PendingBanner from '../common/PendingBanner';
import WakeNote from '../common/WakeNote';
import { ADMIN_BADGE_ICON, ADMIN_NAV, NavGroup, NavItem, ORGANIZER_NAV } from './nav';

type DashboardRole = MemberType.ORGANIZER | MemberType.ADMIN;

const isCurrent = (item: NavItem, pathname: string) =>
	item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

const DashboardShell = ({ role, children }: { role: DashboardRole; children: React.ReactNode }) => {
	const { t } = useTranslation('common');
	const router = useRouter();
	const { organizerAccess } = useAuth();
	const createLocked = organizerAccess !== null && organizerAccess !== 'active';
	const { user, allowed } = useRequireRole(role);
	const unreadMessages = useMessagingUnread();
	const [open, setOpen] = useState(false);
	const isAdmin = role === MemberType.ADMIN;
	const groups: NavGroup[] = isAdmin ? ADMIN_NAV : ORGANIZER_NAV;
	const roleLabel = t(isAdmin ? 'dashboard.admin' : 'dashboard.organizer');
	const current = groups.flatMap((group) => group.items).find((item) => isCurrent(item, router.pathname));

	const opener = useRef<HTMLButtonElement>(null);
	const closeButton = useRef<HTMLButtonElement>(null);
	const wasOpen = useRef(false);

	// The drawer closes after navigating.
	useEffect(() => setOpen(false), [router.asPath]);

	// Phone drawer as a dialog (same pattern as the admin organizer drawer): Escape closes, focus goes in on open and back to the
	// opener on close, the page behind is inert while it is open. From 1024 px the sidebar is permanent, so an open drawer is closed.
	useEffect(() => {
		const main = document.querySelector<HTMLElement>('.tz-main');
		if (open) {
			wasOpen.current = true;
			main?.setAttribute('inert', '');
			closeButton.current?.focus();
			const onKey = (event: KeyboardEvent) => {
				if (event.key === 'Escape') setOpen(false);
			};
			const wide = window.matchMedia('(min-width: 1024px)');
			const onWide = () => wide.matches && setOpen(false);
			document.addEventListener('keydown', onKey);
			wide.addEventListener('change', onWide);
			return () => {
				document.removeEventListener('keydown', onKey);
				wide.removeEventListener('change', onWide);
				main?.removeAttribute('inert');
			};
		}
		if (wasOpen.current) {
			wasOpen.current = false;
			opener.current?.focus();
		}
		return undefined;
	}, [open]);

	// Nothing of the dashboard is shown until the member is known to be allowed in.
	if (!allowed || !user) return null;

	const renderItem = (item: NavItem) => (
		<li key={item.href}>
			<Link href={item.href} className="tz-navitem" aria-current={current === item ? 'page' : undefined}>
				{item.icon}
				<span>{t(item.label)}</span>
				{item.messages && unreadMessages > 0 && (
					<>
						<span className="tz-navitem__count" aria-hidden="true">
							{unreadMessages > 99 ? '99+' : unreadMessages}
						</span>
						<span className="tz-sr">{t('dashboard.unreadMessages', { count: unreadMessages })}</span>
					</>
				)}
			</Link>
		</li>
	);

	return (
		<>
			<Head>
				<title>{`${t(current?.label ?? 'dashboard.nav.overview')} · Ticketzy`}</title>
				<meta name="robots" content="noindex" />
			</Head>
			<div className="tz-app tz-app--dash">
				<div className={`tz-shell ${isAdmin ? 'tz-shell--admin' : ''}`}>
					<aside
						id="tz-sidebar"
						className={`tz-sidebar ${open ? 'is-open' : ''}`}
						aria-label={roleLabel}
						role={open ? 'dialog' : undefined}
						aria-modal={open ? true : undefined}
					>
						<div className="tz-sidebar__head">
							<Brand />
							<span className="tz-rolebadge">
								{isAdmin && ADMIN_BADGE_ICON}
								{roleLabel}
							</span>
							<IconButton ref={closeButton} className="tz-sidebar__close" aria-label={t('dashboard.closeSidebar')} onClick={() => setOpen(false)}>
								<X size={20} />
							</IconButton>
						</div>
						{!isAdmin && (
							<div>
								<Button
									component={createLocked ? 'button' : Link}
									{...(createLocked ? { disabled: true } : { href: '/organizer/events/new' })}
									variant="contained"
									fullWidth
									startIcon={<Plus size={20} aria-hidden />}
								>
									{t('dashboard.createEvent')}
								</Button>
								{createLocked && <p className="tz-sidebar__locked">{t(`dashboard.createEventLocked_${organizerAccess}`)}</p>}
							</div>
						)}
						<nav aria-label={roleLabel}>
							<ul className="tz-nav">
								{groups.map((group) => (
									<React.Fragment key={group.title ?? 'main'}>
										{group.title && <li className="tz-nav__group">{t(group.title)}</li>}
										{group.items.map(renderItem)}
									</React.Fragment>
								))}
							</ul>
						</nav>
						<div className="tz-sidebar__foot">
							{isAdmin ? (
								<Link href="/" className="tz-navitem">
									<ArrowLeft size={20} aria-hidden />
									<span>{t('dashboard.backToSite')}</span>
								</Link>
							) : (
								<Link href="/contact" className="tz-navitem">
									<Info size={20} aria-hidden />
									<span>{t('dashboard.helpAndSupport')}</span>
								</Link>
							)}
						</div>
					</aside>
					{open && <div className="tz-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
					<div className="tz-main">
						<header className="tz-topbar">
							<IconButton
								ref={opener}
								className="tz-topbar__menu"
								aria-label={t(open ? 'dashboard.closeSidebar' : 'dashboard.openSidebar')}
								aria-expanded={open}
								aria-controls="tz-sidebar"
								onClick={() => setOpen((value) => !value)}
							>
								<List size={22} />
							</IconButton>
							<h2 className="tz-topbar__title">{t(current?.label ?? 'dashboard.nav.overview')}</h2>
							<span className="tz-rolebadge tz-topbar__role">
								{isAdmin && ADMIN_BADGE_ICON}
								{roleLabel}
							</span>
							<div className="tz-topbar__actions">
								<LanguageSwitcher />
								<ThemeToggle />
								<NotificationBell user={user} />
								<AccountMenu user={user} />
							</div>
						</header>
						<PendingBanner />
						<WakeNote />
						<main id="main" className="tz-content">
							{children}
						</main>
					</div>
				</div>
			</div>
		</>
	);
};

/** Wraps a page in the organizer or admin shell and guards it by role. */
export const createDashboardLayout = (role: DashboardRole) => <P extends object>(Component: ComponentType<P>) => {
	const WithDashboardLayout = (props: P) => (
		<DashboardShell role={role}>
			<Component {...props} />
		</DashboardShell>
	);
	return WithDashboardLayout;
};

export default DashboardShell;
