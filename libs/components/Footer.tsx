import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { ROUTES } from '../routes';
import Brand from './common/Brand';
import LanguageSwitcher from './common/LanguageSwitcher';

/** Several targets (FAQ, contact, about, terms, privacy) are static pages that come in a later phase. */
const Footer = () => {
	const { t } = useTranslation('common');

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
								<Link href={ROUTES.events}>{t('footer.events')}</Link>
							</li>
						</ul>
					</div>
					<div>
						<h2 className="tz-footer__title">{t('footer.organizers')}</h2>
						<ul className="tz-footer__list">
							<li>
								<Link href={`${ROUTES.signup}?role=organizer`}>{t('footer.sellTickets')}</Link>
							</li>
							<li>
								<Link href={ROUTES.login}>{t('footer.organizerSignIn')}</Link>
							</li>
						</ul>
					</div>
					<div>
						<h2 className="tz-footer__title">{t('footer.help')}</h2>
						<ul className="tz-footer__list">
							<li>
								<Link href="/faq">{t('footer.faq')}</Link>
							</li>
							<li>
								<Link href="/contact">{t('footer.contact')}</Link>
							</li>
							<li>
								<Link href="/about">{t('footer.about')}</Link>
							</li>
						</ul>
					</div>
				</div>
				<div className="tz-footer__bar">
					<div className="tz-footer__legal">
						<span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
						<Link href="/terms" className="tz-link">
							{t('footer.terms')}
						</Link>
						<Link href="/privacy" className="tz-link">
							{t('footer.privacy')}
						</Link>
					</div>
					<LanguageSwitcher variant="segmented" />
				</div>
			</div>
		</footer>
	);
};

export default Footer;
