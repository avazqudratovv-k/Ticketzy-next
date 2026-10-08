import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CalendarX, Prohibit, WarningCircle } from 'phosphor-react';
import { GET_EVENT, GET_SEAT_CONFIG, GET_TICKET_TYPES } from '../../../apollo/user/query';
import withLayoutBasic from '../../../libs/components/layout/LayoutBasic';
import Seo from '../../../libs/components/common/Seo';
import StateBlock from '../../../libs/components/states/StateBlock';
import GeneralPicker from '../../../libs/components/seats/GeneralPicker';
import SeatPicker from '../../../libs/components/seats/SeatPicker';
import Steps from '../../../libs/components/seats/Steps';
import { useRequireAuth } from '../../../libs/auth/guards';
import { localizedEvent, saleState } from '../../../libs/events';
import { formatEventWhen } from '../../../libs/format';
import { NETWORK_ERROR, parseApiError } from '../../../libs/errors';
import { eventUrl, ROUTES } from '../../../libs/routes';
import { SeatConfig } from '../../../libs/seats/types';
import { EventItem, TicketTypeItem } from '../../../libs/types/event';

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'events', 'checkout'])) },
});

/** Seat map for RESERVED events, quantity selector for GENERAL ones. Needs a signed-in buyer. */
const Seats: NextPage = () => {
	const { t } = useTranslation('checkout');
	const router = useRouter();
	const { locale } = router;
	const { allowed } = useRequireAuth();
	const eventId = typeof router.query.id === 'string' ? router.query.id : '';
	const skip = !router.isReady || !allowed;

	const { data, error, refetch } = useQuery(GET_EVENT, { variables: { eventId }, skip, fetchPolicy: 'network-only' });
	const { data: ticketData } = useQuery(GET_TICKET_TYPES, { variables: { eventId }, skip, fetchPolicy: 'network-only' });
	const { data: configData } = useQuery(GET_SEAT_CONFIG, { skip, fetchPolicy: 'network-only' });

	const event: EventItem | undefined = data?.getEvent;
	const ticketTypes: TicketTypeItem[] | undefined = ticketData?.getTicketTypes;
	const config: SeatConfig | undefined = configData?.getSeatConfig;
	const back = (
		<Button component={Link} href={eventUrl(eventId)} variant="outlined">
			{t('page.back')}
		</Button>
	);

	if (!allowed) return null;

	if (error && !event) {
		const network = parseApiError(error).code === NETWORK_ERROR;
		return (
			<div className="tz-container checkout">
				<Seo title={t('page.seatsTitle')} noindex />
				<StateBlock
					alert={network}
					icon={network ? <WarningCircle size={28} /> : <Prohibit size={28} />}
					title={network ? t('page.loadError') : t('page.notFound')}
					text={network ? t('errors.network') : t('page.notFoundText')}
					actions={
						network ? (
							<Button variant="outlined" onClick={() => refetch()}>
								{t('page.retry')}
							</Button>
						) : (
							<Button component={Link} href={ROUTES.events} variant="outlined">
								{t('page.browse')}
							</Button>
						)
					}
				/>
			</div>
		);
	}

	if (!event || !ticketTypes || !config) {
		return (
			<div className="tz-container checkout" aria-busy="true">
				<Seo title={t('page.seatsTitle')} noindex />
				<span className="tz-skel tz-skel--title" style={{ width: '40%', height: 40 }} />
				<span className="tz-skel tz-skel--block" style={{ height: 420, marginTop: 24 }} />
			</div>
		);
	}

	const { title } = localizedEvent(event, locale);
	const venue = event.venueData;
	const state = saleState(event, ticketTypes);
	const reserved = event.seatingType === 'RESERVED';

	return (
		<div className="tz-container checkout">
			<Seo title={`${reserved ? t('page.seatsTitle') : t('page.ticketsTitle')} · ${title}`} noindex />
			<Steps current={1} />
			<Link href={eventUrl(event._id)} className="tz-link checkout__back">
				{t('page.back')}
			</Link>
			<h1 className="checkout__title">{reserved ? t('page.seatsTitle') : t('page.ticketsTitle')}</h1>
			<p className="checkout__sub">
				{title} · {formatEventWhen(event.startAt, event.endAt, locale, venue?.venueTimezone, true)}
				{venue && ` · ${venue.venueName}, ${venue.venueCity}`}
			</p>

			{state === 'onSale' ? (
				reserved ? (
					<SeatPicker eventId={event._id} ticketTypes={ticketTypes} config={config} />
				) : (
					<GeneralPicker eventId={event._id} ticketTypes={ticketTypes} config={config} />
				)
			) : (
				<StateBlock
					icon={<CalendarX size={28} />}
					title={t(`page.state.${state}.title`)}
					text={t(`page.state.${state}.text`)}
					actions={back}
				/>
			)}
		</div>
	);
};

export default withLayoutBasic(Seats);
