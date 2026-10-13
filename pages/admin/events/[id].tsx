import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NextPage, GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useApolloClient, useQuery } from '@apollo/client';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ArrowLeft, ArrowSquareOut, CheckCircle, Clock, MapPin, Prohibit, WarningCircle, XCircle, ArrowClockwise, Translate } from 'phosphor-react';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';
import StateBlock from '../../../libs/components/states/StateBlock';
import EventStatusBadge from '../../../libs/components/organizer/EventStatusBadge';
import EventImage from '../../../libs/components/events/EventImage';
import ReasonDialog from '../../../libs/components/admin/ReasonDialog';
import ModerationPanel from '../../../libs/components/admin/ModerationPanel';
import MemberStatusBadge from '../../../libs/components/admin/MemberStatusBadge';
import VenueConflictPanel from '../../../libs/components/admin/VenueConflictPanel';
import { bookedParams } from '../../../libs/venueConflict';

import {
	APPROVE_EVENT_BY_ADMIN,
	CANCEL_EVENT_BY_ADMIN,
	REJECT_EVENT_BY_ADMIN,
	RETRY_EVENT_REFUNDS_BY_ADMIN,
} from '../../../apollo/admin/mutation';
import { GET_ADMIN_EVENT, GET_ADMIN_TICKET_TYPES } from '../../../apollo/admin/query';
import { AdminError, describeAdminError, isOnlyNoData } from '../../../libs/admin/errors';
import { AdminEvent, AdminTicketType, organizerName } from '../../../libs/admin/types';
import { effectiveRate } from '../../../libs/admin/commission';
import { eventUrl } from '../../../libs/routes';
import { EventLocaleCode } from '../../../libs/types/event';
import { formatEventSummary, formatNumber, formatPrice, formatViewerDate } from '../../../libs/format';
import { NETWORK_ERROR, parseApiError } from '../../../libs/errors';

const EventLayoutPreview = dynamic(() => import('../../../libs/components/admin/EventLayoutPreview'), { ssr: false, loading: () => <div className="tz-skel lazy-skel" aria-hidden="true" /> });

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: {
		...(await serverSideTranslations(locale as string, ['common', 'admin', 'organizer', 'events', 'checkout'])),
	},
});

const LOCALES: EventLocaleCode[] = ['EN', 'KO', 'RU', 'UZ'];

interface RefundSummary {
	refundedCount: number;
	failedCount: number;
	totalCount: number;
}

const AdminEventDetail: NextPage = () => {
	const { t } = useTranslation('admin');
	const { t: te } = useTranslation('events');
	const router = useRouter();
	const { locale } = router;
	const client = useApolloClient();
	const eventId = typeof router.query.id === 'string' ? router.query.id : '';

	const { data, error, refetch } = useQuery(GET_ADMIN_EVENT, { variables: { eventId }, skip: !eventId, fetchPolicy: 'cache-and-network' });
	const event: AdminEvent | null = data?.getEvent ?? null;
	const {
		data: typeData,
		error: typeError,
		refetch: refetchTypes,
	} = useQuery(GET_ADMIN_TICKET_TYPES, { variables: { eventId }, skip: !eventId, fetchPolicy: 'cache-and-network' });
	const ticketTypes: AdminTicketType[] | null = typeData?.getTicketTypes ?? null;

	const [notice, setNotice] = useState<{ tone: 'success' | 'info'; text: string } | null>(null);
	const [rejectOpen, setRejectOpen] = useState(false);
	const [cancelOpen, setCancelOpen] = useState(false);
	const [approveOpen, setApproveOpen] = useState(false);
	const [approving, setApproving] = useState(false);
	const [approveError, setApproveError] = useState<AdminError | null>(null);
	const approveErrorRef = useRef<HTMLParagraphElement>(null);
	// the dialog scrolls on small screens: bring the refusal into view
	useEffect(() => {
		if (approveError) approveErrorRef.current?.scrollIntoView({ block: 'nearest' });
	}, [approveError]);
	const [checking, setChecking] = useState(false);
	const [refundError, setRefundError] = useState<AdminError | null>(null);
	const [summary, setSummary] = useState<RefundSummary | null>(null);

	const title = event ? event.eventTitle : '';
	const zone = event?.venueData?.venueTimezone;
	const entries = useMemo(
		() =>
			LOCALES.map((code) => {
				const own = event?.eventTranslations.find((entry) => entry.locale === code && entry.title?.trim());
				if (own) return { code, title: own.title, description: own.description, source: 'translation' as const };
				if (code === 'EN' && event) return { code, title: event.eventTitle, description: event.eventDesc, source: 'original' as const };
				return { code, title: '', description: null, source: 'missing' as const };
			}),
		[event],
	);
	const money = (amount: number, currency?: string) => formatPrice(amount, locale, currency || 'KRW');

	const approve = async () => {
		setApproving(true);
		setApproveError(null);
		try {
			await client.mutate({ mutation: APPROVE_EVENT_BY_ADMIN, variables: { eventId } });
			setApproveOpen(false);
			setNotice({ tone: 'success', text: t('event.notice.approved', { title }) });
			await Promise.all([refetch(), refetchTypes()]);
		} catch (err) {
			setApproveError(describeAdminError(err));
		} finally {
			setApproving(false);
		}
	};

	const reject = async (reason: string) => {
		await client.mutate({ mutation: REJECT_EVENT_BY_ADMIN, variables: { input: { eventId, reason } } });
		setRejectOpen(false);
		setNotice({ tone: 'success', text: t('event.notice.rejected', { title }) });
		await refetch();
	};

	const cancel = async (reason: string) => {
		await client.mutate({ mutation: CANCEL_EVENT_BY_ADMIN, variables: { input: { eventId, reason } } });
		setCancelOpen(false);
		setNotice({ tone: 'success', text: t('event.notice.cancelled', { title }) });
		await refetch();
	};

	const checkRefunds = async () => {
		setChecking(true);
		setRefundError(null);
		try {
			const result = await client.mutate({ mutation: RETRY_EVENT_REFUNDS_BY_ADMIN, variables: { eventId } });
			setSummary(result.data?.retryEventRefundsByAdmin ?? null);
		} catch (err) {
			setRefundError(describeAdminError(err));
		} finally {
			setChecking(false);
		}
	};

	if (error && !event) {
		const missing = isOnlyNoData(error);
		const network = parseApiError(error).code === NETWORK_ERROR;
		return (
			<div className="org-page">
				<StateBlock
					alert={!missing}
					icon={<WarningCircle size={28} />}
					title={missing ? t('event.notFound.title') : t('event.error.title')}
					text={missing ? t('event.notFound.text') : network ? t('errors.network') : t('event.error.text')}
					actions={
						<>
							<Button component={Link} href="/admin/events" variant="outlined">
								{t('event.back')}
							</Button>
							{!missing && (
								<Button variant="contained" onClick={() => refetch()}>
									{t('errors.retry')}
								</Button>
							)}
						</>
					}
				/>
			</div>
		);
	}

	if (!event) {
		return (
			<div className="org-page" aria-busy="true" aria-label={t('event.loading')}>
				<span className="tz-skel tz-skel--block" />
				<span className="tz-skel tz-skel--block" />
				<span className="tz-skel tz-skel--block" />
			</div>
		);
	}

	const organizer = event.memberData;
	const rate = organizer ? effectiveRate(organizer) : null;
	const pending = event.eventStatus === 'PENDING';
	const startPassed = new Date(event.startAt).getTime() < Date.now();
	const organizerHidden = organizer && organizer.memberStatus !== 'ACTIVE';
	const typesHidden = Boolean(typeError) && isOnlyNoData(typeError);
	const hasConflicts = (event.possibleVenueConflicts?.length ?? 0) > 0;

	return (
		<div className="org-page adm-detail">
			<Head>
				<title>{`${title} · ${t('events.title')} · Ticketzy`}</title>
			</Head>
			<Link href="/admin/events" className="adm-back">
				<ArrowLeft size={18} aria-hidden="true" /> {t('event.back')}
			</Link>

			<div className="tz-pagehead org-pagehead">
				<div>
					<h1>{title}</h1>
					<p>
						{t('event.submittedBy', { name: organizerName(organizer) || '–' })} · {t('events.updated', { date: formatViewerDate(event.updatedAt, locale, true) })}
					</p>
				</div>
				<EventStatusBadge status={event.eventStatus} />
			</div>

			{notice && (
				<p className={`tz-alert tz-alert--${notice.tone}`} role="status">
					<CheckCircle size={20} aria-hidden="true" />
					<span>{notice.text}</span>
				</p>
			)}
			{event.eventStatus === 'REJECTED' && event.rejectReason && (
				<p className="tz-alert tz-alert--error" role="note">
					<XCircle size={20} aria-hidden="true" />
					<span>
						<strong>{t('event.rejectedWith')}</strong> {event.rejectReason}
					</span>
				</p>
			)}
			{event.eventStatus === 'CANCELLED' && event.cancelReason && (
				<p className="tz-alert tz-alert--error" role="note">
					<Prohibit size={20} aria-hidden="true" />
					<span>
						<strong>{t('event.cancelledWith')}</strong> {event.cancelReason}
					</span>
				</p>
			)}

			<VenueConflictPanel conflicts={event.possibleVenueConflicts} timeZone={zone} />

			<div className="adm-detail__grid">
				<div className="adm-detail__main">
					<section className="adm-card" aria-labelledby="ev-info">
						<h2 id="ev-info" className="adm-card__title">
							{t('event.sections.details')}
						</h2>
						{event.eventImages.length > 0 ? (
							<ul className="adm-gallery" aria-label={t('event.images')}>
								{event.eventImages.map((src, index) => (
									<li key={`${src}-${index}`}>
										<EventImage src={src} sizes="(min-width: 768px) 33vw, 100vw" alt={t('event.imageAlt', { n: index + 1, title })} />
									</li>
								))}
							</ul>
						) : (
							<p className="adm-muted">{t('event.noImages')}</p>
						)}
						<dl className="org-dl adm-dl">
							<div>
								<dt>{t('event.fields.category')}</dt>
								<dd>{te(`categories.${event.eventCategory}`)}</dd>
							</div>
							<div>
								<dt>{t('event.fields.seating')}</dt>
								<dd>{t(`event.seating.${event.seatingType}`)}</dd>
							</div>
							<div>
								<dt>{t('event.fields.when')}</dt>
								<dd>{formatEventSummary(event.startAt, event.endAt, locale, zone)}</dd>
							</div>
							<div>
								<dt>{t('event.fields.salesWindow')}</dt>
								<dd>
									{event.saleStartAt || event.saleEndAt
										? t('event.salesRange', {
												from: event.saleStartAt ? formatViewerDate(event.saleStartAt, locale, true) : t('event.salesOpen'),
												to: event.saleEndAt ? formatViewerDate(event.saleEndAt, locale, true) : t('event.salesOpen'),
										  })
										: t('event.salesNone')}
								</dd>
							</div>
							<div>
								<dt>{t('event.fields.fromPrice')}</dt>
								<dd>{event.eventMinPrice > 0 ? money(event.eventMinPrice, ticketTypes?.[0]?.ticketCurrency) : '–'}</dd>
							</div>
							<div>
								<dt>{t('event.fields.created')}</dt>
								<dd>{formatViewerDate(event.createdAt, locale, true)}</dd>
							</div>
						</dl>
						{pending && startPassed && (
							<p className="tz-alert tz-alert--warning" role="note">
								<Clock size={20} aria-hidden="true" />
								<span>{t('event.startPassed')}</span>
							</p>
						)}
					</section>

					<section className="adm-card" aria-labelledby="ev-lang">
						<h2 id="ev-lang" className="adm-card__title">
							<Translate size={20} aria-hidden="true" /> {t('event.sections.content')}
						</h2>
						<p className="adm-muted">{t('event.content.note')}</p>
						<div className="adm-langs">
							{entries.map((entry) => (
								<article key={entry.code} className="adm-lang" lang={entry.code.toLowerCase()}>
									<header>
										<strong>{entry.code}</strong>
										<span className="adm-muted">{t(`event.content.source.${entry.source}`)}</span>
									</header>
									{entry.source === 'missing' ? (
										<p className="adm-muted">{t('event.content.missing')}</p>
									) : (
										<>
											<h3>{entry.title}</h3>
											{entry.description?.trim() ? <p className="adm-lang__text">{entry.description}</p> : <p className="adm-muted">{t('event.content.noDescription')}</p>}
										</>
									)}
								</article>
							))}
						</div>
					</section>

					<section className="adm-card" aria-labelledby="ev-tickets">
						<h2 id="ev-tickets" className="adm-card__title">
							{t('event.sections.tickets')}
						</h2>
						{typesHidden ? (
							<p className="tz-alert tz-alert--warning" role="note">
								<WarningCircle size={20} aria-hidden="true" />
								<span>{t('event.ticketsHidden')}</span>
							</p>
						) : typeError && !ticketTypes ? (
							<p className="tz-alert tz-alert--error" role="alert">
								<WarningCircle size={20} aria-hidden="true" />
								<span>{t('event.ticketsError')}</span>
							</p>
						) : !ticketTypes ? (
							<span className="tz-skel tz-skel--block" aria-busy="true" />
						) : ticketTypes.length === 0 ? (
							<p className="adm-muted">{t('event.noTickets')}</p>
						) : (
							<div className="adm-scroll" role="region" tabIndex={0} aria-label={t('event.tickets.tableLabel')}>
								<table className="adm-tbl">
									<thead>
										<tr>
											<th scope="col">{t('event.tickets.name')}</th>
											<th scope="col" className="org-num">
												{t('event.tickets.price')}
											</th>
											<th scope="col" className="org-num">
												{t('event.tickets.quantity')}
											</th>
											<th scope="col" className="org-num">
												{t('event.tickets.maxPerOrder')}
											</th>
											<th scope="col">{t('event.tickets.window')}</th>
										</tr>
									</thead>
									<tbody>
										{ticketTypes.map((tt) => (
											<tr key={tt._id}>
												<th scope="row">
													{tt.ticketTypeName}
													{tt.tierKey && <span className="adm-muted"> · {tt.tierKey}</span>}
												</th>
												<td className="org-num">{money(tt.ticketPrice, tt.ticketCurrency)}</td>
												<td className="org-num">
													{event.eventStatus === 'DRAFT' || pending
														? formatNumber(tt.totalQuantity, locale)
														: `${formatNumber(tt.soldQuantity, locale)} / ${formatNumber(tt.totalQuantity, locale)}`}
												</td>
												<td className="org-num">{formatNumber(tt.maxPerOrder, locale)}</td>
												<td>
													{tt.saleStartAt || tt.saleEndAt
														? t('event.salesRange', {
																from: tt.saleStartAt ? formatViewerDate(tt.saleStartAt, locale, true) : t('event.salesOpen'),
																to: tt.saleEndAt ? formatViewerDate(tt.saleEndAt, locale, true) : t('event.salesOpen'),
														  })
														: t('event.followsEvent')}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
						{event.seatingType === 'RESERVED' && pending && <p className="adm-muted">{t('event.seatsOnApproval')}</p>}
					</section>

					<section className="adm-card" aria-labelledby="ev-venue">
						<h2 id="ev-venue" className="adm-card__title">
							<MapPin size={20} aria-hidden="true" /> {t('event.sections.venue')}
						</h2>
						{event.venueData ? (
							<>
								<dl className="org-dl adm-dl">
									<div>
										<dt>{t('event.fields.venue')}</dt>
										<dd>{event.venueData.venueName}</dd>
									</div>
									<div>
										<dt>{t('event.fields.address')}</dt>
										<dd>{`${event.venueData.venueAddress}, ${event.venueData.venueCity}`}</dd>
									</div>
									<div>
										<dt>{t('event.fields.timezone')}</dt>
										<dd>{event.venueData.venueTimezone}</dd>
									</div>
									{event.venueData.venueCapacity ? (
										<div>
											<dt>{t('event.fields.capacity')}</dt>
											<dd>{formatNumber(event.venueData.venueCapacity, locale)}</dd>
										</div>
									) : null}
								</dl>
								{event.seatingType === 'RESERVED' ? (
									<EventLayoutPreview venue={event.venueData} ticketTypes={ticketTypes} />
								) : (
									<p className="adm-muted">{t('event.layout.general')}</p>
								)}
							</>
						) : (
							<p className="adm-muted">{t('events.noVenue')}</p>
						)}
					</section>
				</div>

				<aside className="adm-detail__side" aria-label={t('event.sections.decision')}>
					<section className="adm-card" aria-labelledby="ev-decision">
						<h2 id="ev-decision" className="adm-card__title">
							{t('event.sections.decision')}
						</h2>
						{pending ? (
							<>
								<p className="adm-muted">{t('event.decision.pendingText')}</p>
								{organizerHidden && (
									<p className="tz-alert tz-alert--warning" role="note">
										<WarningCircle size={20} aria-hidden="true" />
										<span>{t('event.decision.organizerHidden', { status: t(`memberStatus.${organizer?.memberStatus}`) })}</span>
									</p>
								)}
								<div className="adm-actions">
									<Button variant="contained" startIcon={<CheckCircle size={20} aria-hidden="true" />} onClick={() => { setApproveError(null); setApproveOpen(true); }}>
										{t('event.decision.approve')}
									</Button>
									<Button variant="outlined" className="org-btn-danger" startIcon={<XCircle size={20} aria-hidden="true" />} onClick={() => setRejectOpen(true)}>
										{t('event.decision.reject')}
									</Button>
								</div>
							</>
						) : event.eventStatus === 'APPROVED' ? (
							<>
								<p className="adm-muted">{t('event.decision.approvedText')}</p>
								<div className="adm-actions">
									<Button component={Link} href={eventUrl(event._id)} variant="outlined" startIcon={<ArrowSquareOut size={20} aria-hidden="true" />}>
										{t('event.decision.publicPage')}
									</Button>
									<Button variant="outlined" className="org-btn-danger" startIcon={<Prohibit size={20} aria-hidden="true" />} onClick={() => setCancelOpen(true)}>
										{t('event.decision.cancel')}
									</Button>
								</div>
							</>
						) : event.eventStatus === 'CANCELLED' ? (
							<>
								<p className="adm-muted">{t('event.decision.cancelledText')}</p>
								<div className="adm-actions">
									<Button variant="outlined" onClick={checkRefunds} disabled={checking} startIcon={<ArrowClockwise size={20} aria-hidden="true" />}>
										{checking ? t('event.refunds.checking') : t('event.refunds.check')}
									</Button>
								</div>
								{summary && (
									<p className={`tz-alert tz-alert--${summary.failedCount > 0 ? 'warning' : 'success'}`} role="status">
										{summary.failedCount > 0 ? <WarningCircle size={20} aria-hidden="true" /> : <CheckCircle size={20} aria-hidden="true" />}
										<span>
											{summary.totalCount === 0
												? t('event.refunds.allDone')
												: summary.failedCount > 0
												? t('event.refunds.someFailed', { refunded: summary.refundedCount, failed: summary.failedCount, total: summary.totalCount })
												: t('event.refunds.finished', { refunded: summary.refundedCount })}
										</span>
									</p>
								)}
								{refundError && (
									<p className="tz-alert tz-alert--error" role="alert">
										<WarningCircle size={20} aria-hidden="true" />
										<span>{refundError.network ? t('errors.network') : refundError.key ? t(`serverErrors.${refundError.key}`) : refundError.raw || t('errors.generic')}</span>
									</p>
								)}
							</>
						) : (
							<p className="adm-muted">{t(`event.decision.none_${event.eventStatus}`)}</p>
						)}
					</section>

					<ModerationPanel eventId={event._id} moderation={event.eventModeration} onDone={() => refetch()} />

					{organizer && (
						<section className="adm-card" aria-labelledby="ev-org">
							<h2 id="ev-org" className="adm-card__title">
								{t('event.sections.organizer')}
							</h2>
							<p className="adm-org__name">
								{organizerName(organizer)} <MemberStatusBadge status={organizer.memberStatus} />
							</p>
							<dl className="org-dl adm-dl">
								{organizer.memberEmail && (
									<div>
										<dt>{t('event.org.email')}</dt>
										<dd>{organizer.memberEmail}</dd>
									</div>
								)}
								<div>
									<dt>{t('event.org.events')}</dt>
									<dd>{formatNumber(organizer.memberEvents ?? 0, locale)}</dd>
								</div>
								<div>
									<dt>{t('event.org.completed')}</dt>
									<dd>{formatNumber(organizer.completedEvents ?? 0, locale)}</dd>
								</div>
								{rate && (
									<div>
										<dt>{t('event.org.rate')}</dt>
										<dd>
											{t('percent', { value: formatNumber(rate.rate, locale) })} · {t(`commission.source.${rate.source}`)}
										</dd>
									</div>
								)}
							</dl>
							<Link href={`/admin/organizers?q=${encodeURIComponent(organizer.memberNick || organizer.memberEmail || '')}&tab=all`} className="tz-link">
								{t('event.org.open')}
							</Link>
						</section>
					)}
				</aside>
			</div>

			<Dialog open={approveOpen} onClose={() => !approving && setApproveOpen(false)} aria-labelledby="approve-title" fullWidth maxWidth="sm">
				<DialogTitle id="approve-title">{t('event.approve.title')}</DialogTitle>
				<DialogContent>
					<p className="org-dialog__event">{title}</p>
					<p>{t('event.approve.text')}</p>
					<ul className="org-points">
						<li>{t('event.approve.points.public')}</li>
						{event.seatingType === 'RESERVED' && <li>{t('event.approve.points.seats')}</li>}
						<li>{t('event.approve.points.notify')}</li>
					</ul>
					{hasConflicts && (
						<VenueConflictPanel conflicts={event.possibleVenueConflicts} timeZone={zone} compact id="approve-conflicts" />
					)}
					{organizerHidden && (
						<p className="tz-alert tz-alert--warning" role="note">
							<WarningCircle size={20} aria-hidden="true" />
							<span>{t('event.decision.organizerHidden', { status: t(`memberStatus.${organizer?.memberStatus}`) })}</span>
						</p>
					)}
					{approveError && (
						<p ref={approveErrorRef} className="tz-alert tz-alert--error" role="alert">
							<WarningCircle size={20} aria-hidden="true" />
							<span>
								{approveError.network
									? t('errors.network')
									: approveError.booked
									? t('serverErrors.venueBooked', bookedParams(approveError.booked, locale))
									: approveError.key
									? t(`serverErrors.${approveError.key}`)
									: approveError.raw || t('errors.generic')}
							</span>
						</p>
					)}
				</DialogContent>
				<DialogActions className="org-dialog__actions">
					<Button variant="text" onClick={() => setApproveOpen(false)} disabled={approving}>
						{t('actions.back')}
					</Button>
					<Button variant="contained" onClick={approve} disabled={approving}>
						{approving ? t('event.approve.sending') : hasConflicts ? t('event.approve.anyway') : t('event.approve.confirm')}
					</Button>
				</DialogActions>
			</Dialog>

			<ReasonDialog
				open={rejectOpen}
				title={t('event.reject.title')}
				subject={title}
				reasonLabel={t('event.reject.reasonLabel')}
				reasonHint={t('event.reject.reasonHint')}
				reasonRequired={t('event.reject.reasonRequired')}
				confirmLabel={t('event.reject.confirm')}
				sendingLabel={t('event.reject.sending')}
				cancelLabel={t('actions.back')}
				danger
				onClose={() => setRejectOpen(false)}
				onSubmit={reject}
			>
				<p>{t('event.reject.text')}</p>
			</ReasonDialog>

			<ReasonDialog
				open={cancelOpen}
				title={t('event.cancel.title')}
				subject={title}
				reasonLabel={t('event.cancel.reasonLabel')}
				reasonHint={t('event.cancel.reasonHint')}
				reasonRequired={t('event.cancel.reasonRequired')}
				confirmLabel={t('event.cancel.confirm')}
				sendingLabel={t('event.cancel.sending')}
				cancelLabel={t('event.cancel.keep')}
				danger
				onClose={() => setCancelOpen(false)}
				onSubmit={cancel}
			>
				<p className="tz-alert tz-alert--warning" role="note">
					<WarningCircle size={20} aria-hidden="true" />
					<span>
						<strong>{t('event.cancel.refundTitle')}</strong> {t('event.cancel.refundText')}
					</span>
				</p>
				<ul className="org-points">
					{(['closed', 'refunds', 'used', 'notices', 'retry', 'stock'] as const).map((point) => (
						<li key={point}>{t(`event.cancel.points.${point}`)}</li>
					))}
				</ul>
			</ReasonDialog>
		</div>
	);
};

export default withAdminLayout(AdminEventDetail);
