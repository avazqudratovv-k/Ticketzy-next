import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Divider, Menu, MenuItem } from '@mui/material';
import { SignOut } from 'phosphor-react';
import { useTranslation } from 'next-i18next';
import { MemberType } from '../../enums/member.enum';
import { MemberProfile } from '../../types/member';
import { logOut } from '../../auth';
import { ROUTES } from '../../routes';
import Avatar, { displayName } from './Avatar';

/** Role-based links of the avatar menu. Organizer and admin targets that do not exist yet come with the dashboards. */
const linksFor = (type: MemberType): { href: string; key: string }[] => {
	switch (type) {
		case MemberType.ADMIN:
			return [
				{ href: ROUTES.adminDashboard, key: 'account.adminDashboard' },
				{ href: '/admin/queue', key: 'account.reviewQueue' },
			];
		case MemberType.ORGANIZER:
			return [
				{ href: ROUTES.organizerDashboard, key: 'account.organizerDashboard' },
				{ href: '/organizer/events', key: 'account.organizerEvents' },
				{ href: '/organizer/profile', key: 'account.organizerProfile' },
			];
		default:
			return [
				{ href: ROUTES.tickets, key: 'account.myTickets' },
				{ href: ROUTES.orders, key: 'account.orders' },
				{ href: ROUTES.notifications, key: 'account.notifications' },
				{ href: ROUTES.settings, key: 'account.settings' },
			];
	}
};

const AccountMenu = ({ user }: { user: MemberProfile }) => {
	const { t } = useTranslation('common');
	const router = useRouter();
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);
	const close = () => setAnchor(null);

	const handleLogout = async () => {
		close();
		// Leave the page first so a guarded page does not bounce to the login screen with a returnTo.
		await router.push(ROUTES.home);
		logOut();
	};

	return (
		<>
			<button
				type="button"
				className="tz-account__trigger"
				aria-label={t('header.accountMenu')}
				aria-haspopup="menu"
				aria-expanded={Boolean(anchor)}
				onClick={(event) => setAnchor(event.currentTarget)}
			>
				<Avatar user={user} />
			</button>
			<Menu
				anchorEl={anchor}
				open={Boolean(anchor)}
				onClose={close}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
				transformOrigin={{ vertical: 'top', horizontal: 'right' }}
			>
				<div className="tz-account__head">
					<strong>{displayName(user)}</strong>
					{user.memberEmail && <span>{user.memberEmail}</span>}
					<span className="tz-rolebadge">{t(`account.role.${user.memberType}`)}</span>
				</div>
				<Divider sx={{ my: 1 }} />
				{linksFor(user.memberType).map(({ href, key }) => (
					<MenuItem key={href} component={Link} href={href} onClick={close}>
						{t(key)}
					</MenuItem>
				))}
				<Divider sx={{ my: 1 }} />
				<MenuItem onClick={handleLogout}>
					<SignOut size={20} aria-hidden="true" />
					{t('account.logout')}
				</MenuItem>
			</Menu>
		</>
	);
};

export default AccountMenu;
