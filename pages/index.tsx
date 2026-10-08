import { NextPage } from 'next';
import Link from 'next/link';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withLayoutHome from '../libs/components/layout/LayoutHome';
import { ROUTES } from '../libs/routes';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common'])),
	},
});

/** Placeholder: shows the theme and layout. The real home page comes in a later phase. */
const Home: NextPage = () => {
	const { t } = useTranslation('common');
	const categories = [
		{ title: t('home.concerts'), text: t('home.concertsText') },
		{ title: t('home.football'), text: t('home.footballText') },
		{ title: t('home.comedy'), text: t('home.comedyText') },
	];

	return (
		<div className="tz-container home">
			<section className="home__hero">
				<h1>{t('home.title')}</h1>
				<p>{t('home.subtitle')}</p>
				<div className="home__actions">
					<Button component={Link} href={ROUTES.events} variant="contained" size="large">
						{t('home.browse')}
					</Button>
					<Button component={Link} href={`${ROUTES.signup}?role=organizer`} variant="outlined" size="large">
						{t('home.sell')}
					</Button>
				</div>
			</section>
			<section className="home__section" aria-labelledby="home-categories">
				<h2 id="home-categories">{t('home.categories')}</h2>
				<div className="home__cats">
					{categories.map(({ title, text }) => (
						<div className="home__cat" key={title}>
							<strong>{title}</strong>
							<span>{text}</span>
						</div>
					))}
				</div>
			</section>
		</div>
	);
};

export default withLayoutHome(Home);
