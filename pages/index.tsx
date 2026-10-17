import { useMemo, useState } from 'react';
import { NextPage, GetStaticPropsContext } from 'next';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { WarningCircle } from 'phosphor-react';
import { GET_EVENTS, GET_HOME_ORGANIZERS } from '../apollo/user/query';
import withLayoutHome from '../libs/components/layout/LayoutHome';
import Seo from '../libs/components/common/Seo';
import StateBlock from '../libs/components/states/StateBlock';
import EventCard, { EventCardSkeleton } from '../libs/components/events/EventCard';
import { categoryIcon } from '../libs/components/events/CategoryChip';
import { CategoryRow } from '../libs/components/events/CategoryRow';
import { Hero, OrganizersBlock } from '../libs/components/events/HomeSections';
import { CATEGORY_SLUGS } from '../libs/events';
import { FEATURED_POOL, pickFeatured, upcomingFrom, upcomingSearch } from '../libs/homeFeatured';
import { serverNow } from '../libs/seats/clock';
import { EventItem } from '../libs/types/event';
import { ROUTES } from '../libs/routes';
import useAuth from '../libs/hooks/useAuth';
import { GetEventsData, GetEventsVars } from '../libs/types/queries';

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: {
		...(await serverSideTranslations(locale ?? 'en', ['common', 'events'])),
	},
});

const Home: NextPage = () => {
	const { t } = useTranslation(['events', 'common']);
	// The events wait for the stored session so the first request already carries the token (the heart of a liked event depends on it)
	const { ready } = useAuth();
	// one clock for the whole page: the hero query and the four category rows share the same "upcoming" window
	const [clock] = useState(() => serverNow());
	const from = useMemo(() => upcomingFrom(clock), [clock]);

	// One query ranks the hero and its three neighbours (no per-event requests); each category row has its own query
	const hero = useQuery<GetEventsData, GetEventsVars>(GET_EVENTS, {
		variables: { input: { page: 1, limit: FEATURED_POOL, sort: 'startAt', direction: 'ASC', search: upcomingSearch(from) } },
		skip: !ready,
		fetchPolicy: 'cache-and-network',
		notifyOnNetworkStatusChange: true,
	});
	const organizers = useQuery(GET_HOME_ORGANIZERS, {
		variables: { organizers: { page: 1, limit: 4, sort: 'memberRank', direction: 'DESC', search: {} } },
		fetchPolicy: 'cache-and-network',
	});

	const upcoming = useMemo<EventItem[]>(() => hero.data?.getEvents?.list ?? [], [hero.data]);
	const { hero: heroEvent, side: sideEvents, featured } = useMemo(() => pickFeatured(upcoming, clock), [upcoming, clock]);
	const empty = hero.data && upcoming.length === 0;

	return (
		<div className="tz-container home">
			<Seo title="Ticketzy" description={t('events:home.seoDescription')} image={heroEvent?.eventImages?.[0]} />

			{!hero.data && hero.loading && (
				<div className="home__top" aria-busy="true">
					<div className="tz-hero tz-hero--skel tz-skel" aria-hidden="true" />
					<div className="home__side">
						{[0, 1, 2].map((i) => (
							<EventCardSkeleton key={i} variant="row" />
						))}
					</div>
				</div>
			)}

			{!hero.data && hero.error && (
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('events:errors.loadTitle')}
					text={t('events:errors.loadText')}
					actions={
						<Button variant="outlined" onClick={() => hero.refetch()}>
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

			{heroEvent && (
				<div className="home__top">
					<Hero event={heroEvent} featured={featured} />
					{sideEvents.length > 0 && (
						<div className="home__side">
							{sideEvents.map((event) => (
								<EventCard key={event._id} event={event} variant="row" eager />
							))}
						</div>
					)}
				</div>
			)}

			{!empty &&
				CATEGORY_SLUGS.map((category) => (
					<CategoryRow key={category.slug} category={category} from={from} title={t(`events:home.rows.${category.slug}`)} />
				))}

			{organizers.data && <OrganizersBlock organizers={organizers.data.organizers?.list ?? []} />}
		</div>
	);
};

export default withLayoutHome(Home);
