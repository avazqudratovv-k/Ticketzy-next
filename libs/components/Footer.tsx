import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { ROUTES } from '../routes';
import { categoryHref } from '../events';
import useAuth from '../hooks/useAuth';
import { MemberType } from '../enums/member.enum';
import Brand from './common/Brand';
import LanguageSwitcher from './common/LanguageSwitcher';

/** The Organizers column depends on the session: only links the role can open without being redirected. */
const organizerLinks = (type?: MemberType): { href: string; key: string }[] => {
	switch (type) {
		case MemberType.ADMIN:
			return [
				{ href: ROUTES.adminDashboard, key: 'footer.adminPanel' },
				{ href: '/admin/messages', key: 'footer.messages' },
			];
		case MemberType.ORGANIZER:
			return [
				{ href: ROUTES.organizerDashboard, key: 'footer.organizerDashboard' },
				{ href: '/organizer/messages', key: 'footer.messages' },
			];
		case MemberType.USER:
			return [{ href: ROUTES.sell, key: 'footer.sellTickets' }];
		default:
			return [
				{ href: `${ROUTES.signup}?role=organizer`, key: 'footer.sellTickets' },
				{ href: ROUTES.login, key: 'footer.organizerSignIn' },
			];
	}
};

/** FAQ, contact, about, terms and privacy are left out until those pages exist. */
const Footer = () => {
	const { t } = useTranslation('common');
	const { user, ready } = useAuth();

	return (
		<footer className="tz-footer">
			<div className="tz-container">
				<div className="tz-footer__grid">
					<div className="tz-footer__about">
						<Brand />
						<p>{t('footer.tagline')}</p>
					</div>
					<div>
						<h2 className="tz-footer__title">{t('footer.discover')}</h2>
						<ul className="tz-footer__list">
							<li>
								<Link href={categoryHref('concert')}>{t('footer.concerts')}</Link>
							</li>
							<li>
								<Link href={categoryHref('football')}>{t('footer.football')}</Link>
							</li>
							<li>
								<Link href={categoryHref('comedy')}>{t('footer.comedy')}</Link>
							</li>
							<li>
								<Link href={categoryHref('other')}>{t('footer.other')}</Link>
							</li>
							<li>
								<Link href={ROUTES.events}>{t('footer.events')}</Link>
							</li>
						</ul>
					</div>
					<div>
						<h2 className="tz-footer__title">{t('footer.organizers')}</h2>
						<ul className="tz-footer__list">
							{ready &&
								organizerLinks(user?.memberType).map(({ href, key }) => (
									<li key={key}>
										<Link href={href}>{t(key)}</Link>
									</li>
								))}
						</ul>
					</div>
				</div>
				<div className="tz-footer__bar">
					<div className="tz-footer__legal">
						<span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
					</div>
					<LanguageSwitcher variant="segmented" />
				</div>
			</div>
		</footer>
	);
};

export default Footer;
