import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { Bell, Gear, Heart, Receipt, Ticket, UsersThree } from 'phosphor-react';
import { MemberType } from '../../enums/member.enum';
import { useRequireAuth } from '../../auth/guards';
import { ROUTES } from '../../routes';
import useAuth from '../../hooks/useAuth';
import useUnreadCount from '../../hooks/useUnreadCount';

const NAV = [
	{ href: ROUTES.tickets, key: 'nav.tickets', icon: Ticket },
	{ href: ROUTES.orders, key: 'nav.orders', icon: Receipt },
	{ href: ROUTES.notifications, key: 'nav.notifications', icon: Bell },
	{ href: ROUTES.saved, key: 'nav.saved', icon: Heart },
	{ href: ROUTES.following, key: 'nav.following', icon: UsersThree },
	{ href: ROUTES.settings, key: 'nav.settings', icon: Gear },
] as const;

/** Signed-in only. Buyers get the account menu; organizers and admins opening a shared page (notifications, profile) get the page alone. */
const AccountShell = ({ children }: { children: React.ReactNode }) => {
	const { t } = useTranslation('account');
	const { t: tc } = useTranslation('common');
	const { pathname } = useRouter();
	const { allowed, user } = useRequireAuth();
	const { ready } = useAuth();
	const unread = useUnreadCount(false);
	// Until the stored session is checked, a skeleton holds the place; a visitor who is not signed in is sent to the login page
	if (!allowed || !user) {
		return ready ? null : (
			<div className="tz-container acct" aria-busy="true">
				<span className="tz-skel tz-skel--block" style={{ height: 240 }} />
				<span className="tz-skel tz-skel--block" style={{ height: 240 }} />
			</div>
		);
	}

	return (
		<div className={`tz-container acct${user.memberType === MemberType.USER ? '' : ' acct--solo'}`}>
			{user.memberType === MemberType.USER && (
				<nav className="acct__nav" aria-label={t('nav.label')}>
					<ul>
						{NAV.map(({ href, key, icon: Icon }) => {
							const current = pathname === href || pathname.startsWith(`${href}/`);
							return (
								<li key={href}>
									<Link href={href} className="acct__link" aria-current={current ? 'page' : undefined}>
										<Icon size={20} aria-hidden="true" />
										<span>{t(key)}</span>
										{href === ROUTES.notifications && unread > 0 && (
											<span className="acct__count" aria-label={tc('notifications.unreadCount', { count: unread, formatted: unread })}>
												{unread > 99 ? '99+' : unread}
											</span>
										)}
									</Link>
								</li>
							);
						})}
					</ul>
				</nav>
			)}
			<div className="acct__content">{children}</div>
		</div>
	);
};

/** Wraps a page body in the shell; combine with withLayoutBasic. */
export const withAccount = <P extends object>(Page: React.ComponentType<P>) => {
	const Wrapped = (props: P) => (
		<AccountShell>
			<Page {...props} />
		</AccountShell>
	);
	Wrapped.displayName = `withAccount(${Page.displayName || Page.name || 'Page'})`;
	return Wrapped;
};

export default AccountShell;
