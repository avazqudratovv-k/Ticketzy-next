import { NextPage, GetStaticPropsContext } from 'next';
import Link from 'next/link';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CaretDown } from 'phosphor-react';
import withLayoutBasic from '../libs/components/layout/LayoutBasic';
import Seo from '../libs/components/common/Seo';
import StaticPage from '../libs/components/static/StaticPage';
import { MAX_SEATS_PER_ORDER, SEAT_HOLD_SECONDS } from '../libs/site';

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'help'])) },
});

interface Group {
	id: string;
	title: string;
	items: { q: string; a: string }[];
}

const Faq: NextPage = () => {
	const { t } = useTranslation('help');
	const groups = t('faq.groups', { returnObjects: true, seconds: SEAT_HOLD_SECONDS, max: MAX_SEATS_PER_ORDER }) as Group[];

	return (
		<StaticPage title={t('faq.title')} lead={t('faq.lead')}>
			<Seo title={t('faq.title')} description={t('faq.lead')} />
			<nav className="faq__jump" aria-label={t('faq.jump')}>
				<ul>
					{groups.map((group) => (
						<li key={group.id}>
							<a href={`#faq-${group.id}`} className="faq__chip">
								{group.title}
							</a>
						</li>
					))}
				</ul>
			</nav>
			{groups.map((group) => (
				<section key={group.id} id={`faq-${group.id}`} className="doc__section" aria-labelledby={`faq-${group.id}-h`}>
					<h2 id={`faq-${group.id}-h`}>{group.title}</h2>
					{group.items.map((item) => (
						<details key={item.q} className="faq__item">
							<summary>
								<span>{item.q}</span>
								<CaretDown size={18} aria-hidden="true" />
							</summary>
							<p>{item.a}</p>
						</details>
					))}
				</section>
			))}
			<aside className="doc__more" aria-labelledby="faq-more">
				<h2 id="faq-more">{t('faq.more.title')}</h2>
				<p>{t('faq.more.text')}</p>
				<Button component={Link} href="/contact" variant="outlined">
					{t('faq.more.cta')}
				</Button>
			</aside>
		</StaticPage>
	);
};

export default withLayoutBasic(Faq);
