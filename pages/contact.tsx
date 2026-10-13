import { NextPage, GetStaticPropsContext } from 'next';
import Link from 'next/link';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Envelope, ChatCircleText, Question } from 'phosphor-react';
import withLayoutBasic from '../libs/components/layout/LayoutBasic';
import Seo from '../libs/components/common/Seo';
import StaticPage from '../libs/components/static/StaticPage';
import useAuth from '../libs/hooks/useAuth';
import { MemberType } from '../libs/enums/member.enum';
import { ROUTES } from '../libs/routes';
import { CONTACT_EMAIL } from '../libs/site';

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'help'])) },
});

/** Contact details and the in-app inbox for organizers. There is no form: nothing here would send anything. */
const Contact: NextPage = () => {
	const { t } = useTranslation('help');
	const { user, ready } = useAuth();
	const isOrganizer = user?.memberType === MemberType.ORGANIZER;

	return (
		<StaticPage title={t('contact.title')} lead={t('contact.lead')} note={{ title: t('contact.note.title'), text: t('contact.note.text') }}>
			<Seo title={t('contact.title')} description={t('contact.lead')} />
			<ul className="doc__cards">
				<li className="doc__card">
					<Envelope size={24} aria-hidden="true" />
					<h2>{t('contact.email.title')}</h2>
					<p>{t('contact.email.text')}</p>
					<p>
						<a href={`mailto:${CONTACT_EMAIL}`} className="doc__mail">
							{CONTACT_EMAIL}
						</a>
					</p>
					<p className="doc__hint">{t('contact.response')}</p>
					<Button component="a" href={`mailto:${CONTACT_EMAIL}`} variant="outlined">
						{t('contact.email.cta')}
					</Button>
				</li>
				<li className="doc__card">
					<ChatCircleText size={24} aria-hidden="true" />
					<h2>{t('contact.organizers.title')}</h2>
					<p>{t('contact.organizers.text')}</p>
					{ready && isOrganizer && (
						<Button component={Link} href="/organizer/messages" variant="contained">
							{t('contact.organizers.cta')}
						</Button>
					)}
					{ready && !user && (
						<>
							<p className="doc__hint">{t('contact.organizers.signedOut')}</p>
							<Button component={Link} href={ROUTES.login} variant="outlined">
								{t('contact.organizers.signIn')}
							</Button>
						</>
					)}
				</li>
				<li className="doc__card">
					<Question size={24} aria-hidden="true" />
					<h2>{t('contact.faq.title')}</h2>
					<p>{t('contact.faq.text')}</p>
					<Button component={Link} href="/faq" variant="outlined">
						{t('contact.faq.cta')}
					</Button>
				</li>
			</ul>
		</StaticPage>
	);
};

export default withLayoutBasic(Contact);
