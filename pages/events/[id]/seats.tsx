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
import useBuyerOnlyRedirect from '../../../libs/hooks/useBuyerOnlyRedirect';
import { localizedEvent, saleState } from '../../../libs/events';
import { salesInfo, useSalesClock } from '../../../libs/salesWindow';
import SalesNotice from '../../../libs/components/events/SalesNotice';
import { formatEventWhen } from '../../../libs/format';
import { EVENT_ENDED, NETWORK_ERROR, parseApiError } from '../../../libs/errors';
import { eventUrl, ROUTES } from '../../../libs/routes';
import { SeatConfig } from '../../../libs/seats/types';
import { EventItem, TicketTypeItem } from '../../../libs/types/event';
import { GetEventData, GetEventVars } from '../../../libs/types/queries';

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
	// Organizer and admin accounts cannot buy: back to the event page with the message (skeleton for that moment)
	const blocked = useBuyerOnlyRedirect(router.isReady && eventId ? eventUrl(eventId) : null);
	const skip = !router.isReady || !allowed || blocked;

	const { data, error, refetch } = useQuery<GetEventData, GetEventVars>(GET_EVENT, { variables: { eventId }, skip, fetchPolicy: 'network-only' });
	const { data: ticketData } = useQuery(GET_TICKET_TYPES, { variables: { eventId }, skip, fetchPolicy: 'network-only' });
	const { data: configData } = useQuery(GET_SEAT_CONFIG, { skip, fetchPolicy: 'network-only' });

	const event: EventItem | undefined = data?.getEvent;
	const ticketTypes: TicketTypeItem[] | undefined = ticketData?.getTicketTypes;
	const config: SeatConfig | undefined = configData?.getSeatConfig;
	// one timer: the page switches to the picker (or away from it) when a sales boundary passes
	const now = useSalesClock(event, ticketTypes);
	const back = (
		<Button component={Link} href={eventUrl(eventId)} variant="outlined">
			{t('page.back')}
		</Button>
	);

	if (!allowed) return null;

	if (error && !event) {
		const code = parseApiError(error).code;
		const network = code === NETWORK_ERROR;
		const ended = code === EVENT_ENDED;
		return (
			<div className="tz-container checkout">
				<Seo title={t('page.seatsTitle')} noindex />
				<StateBlock
					alert={network}
					icon={network ? <WarningCircle size={28} /> : ended ? <CalendarX size={28} /> : <Prohibit size={28} />}
					title={network ? t('page.loadError') : ended ? t('page.endedTitle') : t('page.notFound')}
					text={network ? t('errors.network') : ended ? t('page.endedText') : t('page.notFoundText')}
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
	const state = saleState(event, ticketTypes, now);
	const reserved = event.seatingType === 'RESERVED';
	const hasDate = (state === 'notStarted' || state === 'saleClosed') && salesInfo(event, ticketTypes, now).at !== null;

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
					<SeatPicker eventId={event._id} ticketTypes={ticketTypes} config={config} refundPolicy={event.refundPolicy} startAt={event.startAt} timeZone={venue?.venueTimezone} venueType={venue?.venueType} />
				) : (
					<GeneralPicker eventId={event._id} ticketTypes={ticketTypes} config={config} refundPolicy={event.refundPolicy} startAt={event.startAt} timeZone={venue?.venueTimezone} />
				)
			) : (
				<StateBlock
					icon={<CalendarX size={28} />}
					title={t(`page.state.${state}.title`)}
					text={hasDate ? undefined : t(`page.state.${state}.text`)}
					extra={<SalesNotice event={event} ticketTypes={ticketTypes} now={now} />}
					actions={back}
				/>
			)}
		</div>
	);
};

export default withLayoutBasic(Seats);
