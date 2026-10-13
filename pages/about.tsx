import { NextPage, GetStaticPropsContext } from 'next';
import Link from 'next/link';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withLayoutBasic from '../libs/components/layout/LayoutBasic';
import Seo from '../libs/components/common/Seo';
import StaticPage from '../libs/components/static/StaticPage';
import { ROUTES } from '../libs/routes';

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'about'])) },
});

const About: NextPage = () => {
	const { t } = useTranslation('about');
	const who = t('who.items', { returnObjects: true }) as { title: string; text: string }[];

	return (
		<StaticPage title={t('title')} lead={t('lead')} note={{ title: t('portfolio.title'), text: t('portfolio.text') }}>
			<Seo title={t('title')} description={t('lead')} />
			<section className="doc__section" aria-labelledby="about-what">
				<h2 id="about-what">{t('what.title')}</h2>
				<p>{t('what.text')}</p>
			</section>
			<section className="doc__section" aria-labelledby="about-who">
				<h2 id="about-who">{t('who.title')}</h2>
				<ul className="doc__cards">
					{who.map((item) => (
						<li key={item.title} className="doc__card">
							<h3>{item.title}</h3>
							<p>{item.text}</p>
						</li>
					))}
				</ul>
			</section>
			<div className="doc__actions">
				<Button component={Link} href={ROUTES.events} variant="contained">
					{t('cta.events')}
				</Button>
				<Button component={Link} href="/faq" variant="outlined">
					{t('cta.faq')}
				</Button>
			</div>
		</StaticPage>
	);
};

export default withLayoutBasic(About);
