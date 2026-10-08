import { NextPage } from 'next';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { WarningCircle } from 'phosphor-react';
import { GET_HOME } from '../apollo/user/query';
import withLayoutHome from '../libs/components/layout/LayoutHome';
import Seo from '../libs/components/common/Seo';
import StateBlock from '../libs/components/states/StateBlock';
import EventCard, { EventCardSkeleton, EventGridSkeleton } from '../libs/components/events/EventCard';
import { categoryIcon } from '../libs/components/events/CategoryChip';
import { EventSection, Hero, OrganizersBlock } from '../libs/components/events/HomeSections';
import { categoryHref, CATEGORY_SLUGS } from '../libs/events';
import { EventItem } from '../libs/types/event';
import { ROUTES } from '../libs/routes';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common', 'events'])),
	},
});

const inquiry = (limit: number, search: Record<string, unknown> = {}, sort = 'startAt', direction = 'ASC') => ({
	page: 1,
	limit,
	sort,
	direction,
	search,
});

const Home: NextPage = () => {
	const { t } = useTranslation(['events', 'common']);
	const { data, loading, error, refetch } = useQuery(GET_HOME, {
		variables: {
			upcoming: inquiry(8),
			popular: inquiry(1, {}, 'eventViews', 'DESC'),
			concerts: inquiry(4, { categoryList: ['CONCERT'] }),
			football: inquiry(4, { categoryList: ['FOOTBALL'] }),
			comedy: inquiry(4, { categoryList: ['COMEDY'] }),
			organizers: inquiry(4, {}, 'memberRank', 'DESC'),
		},
		fetchPolicy: 'cache-and-network',
		notifyOnNetworkStatusChange: true,
	});

	const upcoming: EventItem[] = data?.upcoming?.list ?? [];
	const hero: EventItem | undefined = data?.popular?.list?.[0] ?? upcoming[0];
	const sideEvents = upcoming.filter((event) => event._id !== hero?._id).slice(0, 3);
	const empty = data && upcoming.length === 0;

	return (
		<div className="tz-container home">
			<Seo title="Ticketzy" description={t('events:home.seoDescription')} image={hero?.eventImages?.[0]} />

			{!data && loading && (
				<div className="home__top" aria-busy="true">
					<div className="tz-hero tz-hero--skel tz-skel" aria-hidden="true" />
					<div className="home__side">
						{[0, 1, 2].map((i) => (
							<EventCardSkeleton key={i} variant="row" />
						))}
					</div>
				</div>
			)}

			{!data && error && (
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('events:errors.loadTitle')}
					text={t('events:errors.loadText')}
					actions={
						<Button variant="outlined" onClick={() => refetch()}>
							{t('events:errors.retry')}
						</Button>
					}
				/>
			)}

			{empty && (
				<StateBlock
					icon={categoryIcon('OTHER', 28)}
					title={t('events:home.emptyTitle')}
					text={t('events:home.emptyText')}
					actions={
						<Button component={Link} href={ROUTES.events} variant="outlined">
							{t('events:home.browse')}
						</Button>
					}
				/>
			)}

			{hero && (
				<div className="home__top">
					<Hero event={hero} />
					{sideEvents.length > 0 && (
						<div className="home__side">
							{sideEvents.map((event) => (
								<EventCard key={event._id} event={event} variant="row" />
							))}
						</div>
					)}
				</div>
			)}

			<section className="home__section" aria-labelledby="home-categories">
				<h2 id="home-categories">{t('events:home.categories')}</h2>
				<div className="home__cats">
					{CATEGORY_SLUGS.map((slug) => (
						<Link key={slug.slug} href={categoryHref(slug.slug)} className="home__cat">
							<span className="home__cat-icon">{categoryIcon(slug.category, 22)}</span>
							<strong>{t(`events:categories.${slug.category}`)}</strong>
							<span>{t(`events:home.categoryText.${slug.category}`)}</span>
						</Link>
					))}
				</div>
			</section>

			{!data && loading ? (
				<section className="home__section" aria-busy="true">
					<EventGridSkeleton count={4} />
				</section>
			) : (
				<>
					<EventSection
						id="home-upcoming"
						title={t('events:home.upcoming')}
						events={upcoming}
						seeAllHref={ROUTES.events}
					/>
					<EventSection
						id="home-concerts"
						title={t('events:home.concerts')}
						events={data?.concerts?.list ?? []}
						seeAllHref={categoryHref('concert')}
					/>
					<EventSection
						id="home-football"
						title={t('events:home.football')}
						events={data?.football?.list ?? []}
						seeAllHref={categoryHref('football')}
					/>
					<EventSection
						id="home-comedy"
						title={t('events:home.comedy')}
						events={data?.comedy?.list ?? []}
						seeAllHref={categoryHref('comedy')}
					/>
					{data && <OrganizersBlock organizers={data.organizers?.list ?? []} />}
				</>
			)}
		</div>
	);
};

export default withLayoutHome(Home);
