import { useMemo, useState } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button, Dialog, IconButton } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ArrowsOut, CalendarPlus, CaretLeft, CaretRight, MapPin, Prohibit, SunDim, X } from 'phosphor-react';
import { GET_MY_TICKETS_LIST, GET_TICKET } from '../../apollo/user/query';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import { withAccount } from '../../libs/components/account/AccountShell';
import LoadError from '../../libs/components/account/LoadError';
import QrCode from '../../libs/components/account/QrCode';
import { eventTitleOf } from '../../libs/components/account/OrderRow';
import { TicketBadge } from '../../libs/components/account/StatusBadge';
import EventImage from '../../libs/components/events/EventImage';
import Seo from '../../libs/components/common/Seo';
import { useSectionNames } from '../../libs/hooks/useSectionNames';
import { seatLabel } from '../../libs/seats/label';
import { buildIcs, downloadIcs } from '../../libs/account/ics';
import { ticketState, TicketState } from '../../libs/account/tickets';
import { formatEventWhen, formatPrice, formatViewerDate } from '../../libs/format';
import { eventUrl, orderUrl, ROUTES, ticketUrl } from '../../libs/routes';
import { AccountTicket } from '../../libs/types/account';

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'events', 'checkout', 'account'])) },
});

const Detail = ({ label, value }: { label: string; value: string }) => (
	<div className="tdetail__fact">
		<dt>{label}</dt>
		<dd>{value}</dd>
	</div>
);

const TicketDetail: NextPage = () => {
	const { t } = useTranslation('account');
	const router = useRouter();
	const { locale } = router;
	const ticketId = typeof router.query.ticketId === 'string' ? router.query.ticketId : '';
	const [fullscreen, setFullscreen] = useState(false);

	const { data, error, refetch } = useQuery(GET_TICKET, { variables: { ticketId }, skip: !router.isReady || !ticketId, fetchPolicy: 'cache-and-network' });
	const ticket: AccountTicket | undefined = data?.getTicket;
	const event = ticket?.eventData;
	const venue = event?.venueData;
	const sectionNames = useSectionNames(ticket?.eventId, Boolean(ticket?.seatData));
	// Other tickets of the same order, for the "Ticket 1 of 2" stepper
	const { data: siblingData } = useQuery(GET_MY_TICKETS_LIST, {
		variables: { input: { page: 1, limit: 100 } },
		skip: !ticket,
		fetchPolicy: 'cache-and-network',
	});
	const siblings: AccountTicket[] = useMemo(
		() => ((siblingData?.getMyTickets?.list ?? []) as AccountTicket[]).filter((item) => item.orderId === ticket?.orderId),
		[siblingData, ticket?.orderId],
	);

	if (error && !ticket) {
		return (
			<LoadError
				error={error}
				onRetry={() => refetch()}
				notFoundTitle={t('ticket.notFound')}
				notFoundText={t('ticket.notFoundText')}
				back={
					<Button component={Link} href={ROUTES.tickets} variant="outlined">
						{t('ticket.back')}
					</Button>
				}
			/>
		);
	}
	if (!ticket) {
		return (
			<div aria-busy="true">
				<span className="tz-skel tz-skel--title" style={{ width: '50%', height: 40 }} />
				<span className="tz-skel tz-skel--block" style={{ height: 420, marginTop: 24, maxWidth: 440 }} />
			</div>
		);
	}

	const state: TicketState = ticketState(ticket);
	const title = eventTitleOf(event, locale) || t('order.unknownEvent');
	const when = event ? formatEventWhen(event.startAt, event.endAt, locale, venue?.venueTimezone, true) : '';
	const seat = ticket.seatData;
	const index = siblings.findIndex((item) => item._id === ticket._id);
	const prev = index > 0 ? siblings[index - 1] : undefined;
	const next = index >= 0 ? siblings[index + 1] : undefined;
	const showQr = state === 'valid' && Boolean(ticket.qrToken);
	const qrLabel = t('ticket.qrLabel', { event: title });

	const addToCalendar = () => {
		if (!event) return;
		const seatText = seat ? seatLabel(t, seat, sectionNames) : t('ticket.general');
		downloadIcs(`ticketzy-${ticket._id}.ics`, buildIcs({
			uid: ticket._id,
			title,
			start: event.startAt,
			end: event.endAt,
			location: venue ? [venue.venueName, venue.venueAddress, venue.venueCity].filter(Boolean).join(', ') : undefined,
			description: [ticket.ticketTypeData?.ticketTypeName, seatText].filter(Boolean).join(' · '),
		}));
	};

	return (
		<>
			<Seo title={title} noindex />
			<Link href={ROUTES.tickets} className="acct__back tz-link">
				<CaretLeft size={16} aria-hidden="true" /> {t('ticket.back')}
			</Link>
			<div className="acct__head">
				<div>
					<h1 className="acct__title">{title}</h1>
					<p className="acct__sub">
						{when}
						{venue ? ` · ${venue.venueName}, ${venue.venueCity}` : ''}
					</p>
				</div>
			</div>

			<div className="acct__cols acct__cols--ticket">
				<div className="acct__stack">
					{siblings.length > 1 && index >= 0 && (
						<nav className="tdetail__stepper" aria-label={t('ticket.stepper')}>
							<IconButton component={prev ? Link : 'button'} {...(prev ? { href: ticketUrl(prev._id) } : { disabled: true })} aria-label={t('ticket.prev')}>
								<CaretLeft size={20} />
							</IconButton>
							<span aria-live="polite">{t('ticket.position', { current: index + 1, count: siblings.length })}</span>
							<IconButton component={next ? Link : 'button'} {...(next ? { href: ticketUrl(next._id) } : { disabled: true })} aria-label={t('ticket.next')}>
								<CaretRight size={20} />
							</IconButton>
						</nav>
					)}

					<article className={`tdetail tdetail--${state}`} aria-label={t('ticket.cardLabel')}>
						<div className="tdetail__image">
							<EventImage src={event?.eventImages?.[0]} eager sizes="(min-width: 768px) 720px, 100vw" />
						</div>
						<div className="tdetail__top">
							<TicketBadge state={state} />
							<h2 className="tdetail__title">{title}</h2>
							<dl className="tdetail__facts">
								<Detail label={t('ticket.date')} value={when} />
								{venue && <Detail label={t('ticket.venue')} value={`${venue.venueName}, ${venue.venueCity}`} />}
								{ticket.ticketTypeData && <Detail label={t('ticket.type')} value={ticket.ticketTypeData.ticketTypeName} />}
								{seat ? (
									<div className="tdetail__seat">
										<Detail label={t('ticket.section')} value={sectionNames.get(seat.sectionKey) ?? '–'} />
										<Detail label={t('ticket.row')} value={String(seat.row)} />
										<Detail label={t('ticket.seat')} value={String(seat.number)} />
									</div>
								) : (
									<Detail label={t('ticket.entry')} value={t('ticket.general')} />
								)}
							</dl>
						</div>
						<div className="tdetail__tear" aria-hidden="true" />
						<div className="tdetail__qr">
							{showQr ? (
								<>
									<div className="tdetail__qrbox">
										<QrCode value={ticket.qrToken!} label={qrLabel} />
									</div>
									<p className="tdetail__code">
										<span>{t('ticket.code')}</span> <code>{ticket.ticketCode}</code>
									</p>
									<Button variant="outlined" startIcon={<ArrowsOut size={20} aria-hidden="true" />} onClick={() => setFullscreen(true)}>
										{t('ticket.fullscreen')}
									</Button>
								</>
							) : (
								<div className="tdetail__void" role="status">
									<Prohibit size={32} aria-hidden="true" />
									<strong>{t(`ticket.void.${state}.title`)}</strong>
									<span>
										{state === 'used' && ticket.checkedInAt
											? t('ticket.void.used.textAt', { date: formatViewerDate(ticket.checkedInAt, locale, true) })
											: t(`ticket.void.${state}.text`)}
									</span>
								</div>
							)}
						</div>
					</article>
				</div>

				<div className="acct__stack">
					{state === 'valid' && (
						<section className="card" aria-labelledby="t-actions">
							<h2 id="t-actions" className="card__title">
								{t('ticket.actionsTitle')}
							</h2>
							<p className="breakdown__note">{t('ticket.calendarText')}</p>
							<div>
								<Button variant="outlined" startIcon={<CalendarPlus size={20} aria-hidden="true" />} onClick={addToCalendar}>
									{t('ticket.calendar')}
								</Button>
							</div>
						</section>
					)}
					{state === 'valid' && (
						<section className="card" aria-labelledby="t-door">
							<h2 id="t-door" className="card__title">
								{t('ticket.doorTitle')}
							</h2>
							<ul className="tdetail__tips">
								<li>
									<SunDim size={20} aria-hidden="true" /> {t('ticket.tipBrightness')}
								</li>
								<li>
									<MapPin size={20} aria-hidden="true" /> {t('ticket.tipOffline')}
								</li>
							</ul>
						</section>
					)}
					<section className="card" aria-labelledby="t-order">
						<h2 id="t-order" className="card__title">
							{t('ticket.orderTitle')}
						</h2>
						<dl className="breakdown">
							{ticket.ticketTypeData && (
								<div className="breakdown__row">
									<dt>{t('ticket.pricePaid')}</dt>
									<dd>{formatPrice(ticket.ticketTypeData.ticketPrice, locale, ticket.ticketTypeData.ticketCurrency ?? 'KRW')}</dd>
								</div>
							)}
						</dl>
						<p className="breakdown__note">
							<Link href={orderUrl(ticket.orderId)} className="tz-link">
								{state === 'valid' ? t('ticket.orderRefundLink') : t('ticket.orderLink')}
							</Link>
						</p>
						{event && (
							<p className="breakdown__note">
								<Link href={eventUrl(event._id)} className="tz-link">
									{t('ticket.eventLink')}
								</Link>
							</p>
						)}
					</section>
				</div>
			</div>

			<Dialog open={fullscreen} onClose={() => setFullscreen(false)} fullScreen aria-label={t('ticket.fullscreenTitle')} PaperProps={{ className: 'qrfull' }}>
				<div className="qrfull__bar">
					<span>{title}</span>
					<IconButton onClick={() => setFullscreen(false)} aria-label={t('ticket.close')} autoFocus>
						<X size={28} />
					</IconButton>
				</div>
				<div className="qrfull__body">
					{ticket.qrToken && <QrCode value={ticket.qrToken} label={qrLabel} className="qr--full" />}
					<p className="qrfull__code">
						<code>{ticket.ticketCode}</code>
					</p>
					<p className="qrfull__hint">{t('ticket.tipBrightness')}</p>
				</div>
			</Dialog>
		</>
	);
};

export default withLayoutBasic(withAccount(TicketDetail));
