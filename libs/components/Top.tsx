import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button, IconButton, Menu, MenuItem } from '@mui/material';
import { List } from 'phosphor-react';
import { useTranslation } from 'next-i18next';
import useAuth from '../hooks/useAuth';
import { ROUTES } from '../routes';
import { categoryHref, CategorySlug } from '../events';

const NAV_CATEGORIES: { slug: CategorySlug; key: string }[] = [
	{ slug: 'concert', key: 'nav.concerts' },
	{ slug: 'football', key: 'nav.football' },
	{ slug: 'comedy', key: 'nav.comedy' },
];
import Brand from './common/Brand';
import LanguageSwitcher from './common/LanguageSwitcher';
import ThemeToggle from './common/ThemeToggle';
import AccountMenu from './common/AccountMenu';
import NotificationBell from './notifications/NotificationBell';

const Top = () => {
	const { t } = useTranslation('common');
	const router = useRouter();
	const { user, ready } = useAuth();
	const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
	const closeMenu = () => setMenuAnchor(null);
	const onEvents = router.pathname.startsWith(ROUTES.events);

	return (
		<header className="tz-navbar">
			<div className="tz-container tz-navbar__inner">
				<Brand />
				<nav aria-label={t('nav.mainLabel')}>
					<ul className="tz-navbar__links">
						<li>
							<Link
								href={ROUTES.events}
								className="tz-navbar__link"
								aria-current={onEvents && !router.query.category ? 'page' : undefined}
							>
								{t('nav.events')}
							</Link>
						</li>
						{NAV_CATEGORIES.map(({ slug, key }) => (
							<li key={slug}>
								<Link
									href={categoryHref(slug)}
									className="tz-navbar__link tz-navbar__link--cat"
									aria-current={onEvents && router.query.category === slug ? 'page' : undefined}
								>
									{t(key)}
								</Link>
							</li>
						))}
					</ul>
				</nav>
				<div className="tz-navbar__actions">
					<LanguageSwitcher />
					<ThemeToggle />
					{/* The slot keeps its size until the stored session is checked, so the bar does not jump. */}
					<div className="tz-navbar__auth-slot">
						{ready && user && (
							<div className="tz-navbar__user">
								<NotificationBell user={user} />
								<AccountMenu user={user} />
							</div>
						)}
						{ready && !user && (
							<div className="tz-navbar__desktop">
								<Button component={Link} href={ROUTES.login} variant="text" size="small">
									{t('header.login')}
								</Button>
								<Button component={Link} href={ROUTES.signup} variant="outlined" size="small">
									{t('header.signup')}
								</Button>
							</div>
						)}
					</div>
					<span className="tz-navbar__mobile">
						<IconButton
							aria-label={t('nav.openMenu')}
							aria-haspopup="menu"
							aria-expanded={Boolean(menuAnchor)}
							onClick={(event) => setMenuAnchor(event.currentTarget)}
						>
							<List size={22} />
						</IconButton>
						<Menu
							anchorEl={menuAnchor}
							open={Boolean(menuAnchor)}
							onClose={closeMenu}
							anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
							transformOrigin={{ vertical: 'top', horizontal: 'right' }}
						>
							<MenuItem component={Link} href={ROUTES.events} onClick={closeMenu}>
								{t('nav.events')}
							</MenuItem>
							{NAV_CATEGORIES.map(({ slug, key }) => (
								<MenuItem key={slug} component={Link} href={categoryHref(slug)} onClick={closeMenu}>
									{t(key)}
								</MenuItem>
							))}
							{ready && !user && (
								<MenuItem component={Link} href={ROUTES.login} onClick={closeMenu}>
									{t('header.login')}
								</MenuItem>
							)}
							{ready && !user && (
								<MenuItem component={Link} href={ROUTES.signup} onClick={closeMenu}>
									{t('header.signup')}
								</MenuItem>
							)}
						</Menu>
					</span>
				</div>
			</div>
		</header>
	);
};

export default Top;
