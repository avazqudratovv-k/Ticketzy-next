import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Prohibit, WarningCircle } from 'phosphor-react';
import { GET_EVENTS, GET_ORGANIZER } from '../../apollo/user/query';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import Seo from '../../libs/components/common/Seo';
import StateBlock from '../../libs/components/states/StateBlock';
import EventCard, { EventGridSkeleton } from '../../libs/components/events/EventCard';
import Avatar from '../../libs/components/common/OrganizerAvatar';
import { formatNumber } from '../../libs/format';
import { ROUTES } from '../../libs/routes';
import useAuth from '../../libs/hooks/useAuth';
import { serverQuery } from '../../libs/serverFetch';
import { parseApiError } from '../../libs/errors';
import { EventItem } from '../../libs/types/event';
import { MemberProfile } from '../../libs/types/member';
import { GetEventsData, GetEventsVars } from '../../libs/types/queries';

interface SeoProps {
	name: string;
	description: string | null;
	image: string | null;
}

export const getServerSideProps: GetServerSideProps = async ({ locale, params }) => {
	const data = await serverQuery<{ getMember: Pick<MemberProfile, 'memberType' | 'memberNick' | 'memberFullName' | 'memberDesc' | 'memberImage'> | null }>(
		`query($id:String!){ getMember(memberId:$id){ memberType memberNick memberFullName memberDesc memberImage } }`,
		{ id: String(params?.id ?? '') },
	);
	const member = data?.getMember?.memberType === 'ORGANIZER' ? data.getMember : undefined;
	const seo: SeoProps | null = member
		? {
				name: member.memberFullName || member.memberNick || '',
				description: member.memberDesc ?? null,
				image: member.memberImage ?? null,
		  }
		: null;
	return { props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'events'])), seo } };
};

const LIMIT = 12;

const OrganizerPage: NextPage<{ seo: SeoProps | null }> = ({ seo }) => {
	const { t } = useTranslation('events');
	const router = useRouter();
	const { locale } = router;
	const { ready } = useAuth();
	const id = typeof router.query.id === 'string' ? router.query.id : '';

	const { data, error, loading, refetch } = useQuery(GET_ORGANIZER, {
		variables: { memberId: id },
		skip: !router.isReady,
	});
	const { data: eventsData, loading: eventsLoading } = useQuery<GetEventsData, GetEventsVars>(GET_EVENTS, {
		variables: { input: { page: 1, limit: LIMIT, sort: 'startAt', direction: 'ASC', search: { organizerId: id } } },
		skip: !router.isReady || !ready,
		fetchPolicy: 'cache-and-network',
	});

	const member = data?.getMember?.memberType === 'ORGANIZER' ? data.getMember : undefined;
	if (!member) {
		if (error || data) {
			const missing = !error || parseApiError(error).code !== 'NETWORK_ERROR';
			return (
				<div className="tz-container organizer">
					<Seo title={t('organizer.notFoundTitle')} noindex />
					<StateBlock
						alert={!missing}
						icon={missing ? <Prohibit size={28} /> : <WarningCircle size={28} />}
						title={missing ? t('organizer.notFoundTitle') : t('errors.loadTitle')}
						text={missing ? t('organizer.notFoundText') : t('errors.loadText')}
						actions={
							missing ? (
								<Button component={Link} href={ROUTES.events} variant="outlined">
									{t('home.browse')}
								</Button>
							) : (
								<Button variant="outlined" onClick={() => refetch()}>
									{t('errors.retry')}
								</Button>
							)
						}
					/>
				</div>
			);
		}
		return (
			<div className="tz-container organizer" aria-busy={loading}>
				{seo && <Seo title={seo.name} description={seo.description} image={seo.image} type="profile" />}
				<span className="tz-skel tz-skel--block" style={{ height: 120 }} aria-hidden="true" />
			</div>
		);
	}

	const name = member.memberFullName || member.memberNick || '';
	const events: EventItem[] = eventsData?.getEvents?.list ?? [];
	const total: number = eventsData?.getEvents?.metaCounter?.[0]?.total ?? 0;

	return (
		<div className="tz-container organizer">
			<Seo
				title={name}
				description={member.memberDesc ?? t('organizer.seoDescription', { name })}
				image={member.memberImage}
				type="profile"
			/>
			<header className="organizer__head">
				<Avatar member={member} size={88} />
				<div>
					<h1>{name}</h1>
					{member.memberNick && member.memberNick !== name && <p className="event__muted">@{member.memberNick}</p>}
					{member.memberDesc && <p className="organizer__desc">{member.memberDesc}</p>}
					{member.memberAddress && <p className="event__muted organizer__address">{member.memberAddress}</p>}
					<ul className="event__counts">
						<li>
							{t('organizer.eventsCount', { count: member.memberEvents, n: formatNumber(member.memberEvents, locale) })}
						</li>
						<li>
							{t('organizer.completed', {
								count: member.completedEvents,
								n: formatNumber(member.completedEvents, locale),
							})}
						</li>
					</ul>
				</div>
			</header>

			<section className="home__section" aria-labelledby="org-events">
				<h2 id="org-events">{t('organizer.upcoming')}</h2>
				{!eventsData && eventsLoading && <EventGridSkeleton count={4} />}
				{eventsData && events.length === 0 && (
					<StateBlock
						icon={<Prohibit size={28} />}
						title={t('organizer.noEventsTitle')}
						text={t('organizer.noEventsText')}
						actions={
							<Button component={Link} href={ROUTES.events} variant="outlined">
								{t('home.browse')}
							</Button>
						}
					/>
				)}
				{events.length > 0 && (
					<div className="tz-grid">
						{events.map((event) => (
							<EventCard key={event._id} event={event} />
						))}
					</div>
				)}
				{total > events.length && (
					<p className="event__muted">{t('organizer.moreInList', { count: total - events.length })}</p>
				)}
			</section>
		</div>
	);
};

export default withLayoutBasic(OrganizerPage);
