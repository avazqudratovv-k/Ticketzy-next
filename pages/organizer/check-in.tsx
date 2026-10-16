import dynamic from 'next/dynamic';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NextPage, GetStaticPropsContext } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useApolloClient, useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Calendar, WarningCircle } from 'phosphor-react';
import { withOrganizerLayout } from '../../libs/components/layout/LayoutAdmin';
import BlockedPanel from '../../libs/components/organizer/BlockedPanel';

import ScanResult from '../../libs/components/organizer/checkin/ScanResult';
import StateBlock from '../../libs/components/states/StateBlock';
import useAuth from '../../libs/hooks/useAuth';
import { GET_MY_EVENTS, GET_VENUE_DETAIL } from '../../apollo/organizer/query';
import { CHECK_IN_TICKET, CHECK_IN_TICKET_BY_CODE, GET_CHECKIN_COUNTS } from '../../apollo/organizer/orders';
import { classifyScan, cleanToken, readManual, ScanEntry, ScanOutcome } from '../../libs/organizer/checkin';
import { OrgEvent } from '../../libs/organizer/types';
import { localizedEvent } from '../../libs/events';
import { formatEventWhen, formatNumber } from '../../libs/format';
import { organizerEventsUrl } from '../../libs/routes';

const Scanner = dynamic(() => import('../../libs/components/organizer/checkin/Scanner'), { ssr: false, loading: () => <div className="tz-skel lazy-skel" aria-hidden="true" /> });

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: {
		...(await serverSideTranslations(locale ?? 'en', ['common', 'organizer'])),
	},
});

/** The same code scanned again within this time is the camera seeing one ticket twice, not a second scan. */
const REPEAT_MS = 4000;
const RECENT_MAX = 8;

interface Shown {
	outcome: ScanOutcome;
	buyer?: string;
	place?: string;
	code?: string;
	raw?: string;
	retryAfterSeconds?: number;
}

const CheckIn: NextPage = () => {
	const { t } = useTranslation('organizer');
	const router = useRouter();
	const { locale } = router;
	const client = useApolloClient();
	const { organizerAccess } = useAuth();
	const active = organizerAccess === 'active';
	const skip = !active;

	const { data, error, loading, refetch } = useQuery(GET_MY_EVENTS, {
		variables: { input: { page: 1, limit: 100, sort: 'startAt', direction: 'ASC', search: { eventStatus: 'APPROVED' } } },
		skip,
		fetchPolicy: 'cache-and-network',
	});
	const events: OrgEvent[] = useMemo(() => ((data?.getMyEvents?.list ?? []) as OrgEvent[]).filter((e) => new Date(e.endAt).getTime() > Date.now()), [data]);

	const queryEvent = typeof router.query.event === 'string' ? router.query.event : '';
	const eventId = events.some((e) => e._id === queryEvent) ? queryEvent : '';
	const selected = events.find((e) => e._id === eventId);
	const chooseEvent = (id: string) => {
		setShown(null);
		void router.replace({ pathname: router.pathname, query: id ? { event: id } : {} }, undefined, { shallow: true });
	};

	// section keys (LOWER_N) are for the system; the gate shows the venue's own section names
	const { data: venueData } = useQuery(GET_VENUE_DETAIL, { variables: { venueId: selected?.venueId }, skip: skip || !selected?.venueId, errorPolicy: 'all' });
	const sectionNames = useMemo(
		() => new Map<string, string>(((venueData?.getVenue?.venueLayout?.sections ?? []) as { key: string; name: string }[]).map((sec) => [sec.key, sec.name])),
		[venueData],
	);
	const { data: counts, refetch: refetchCounts } = useQuery(GET_CHECKIN_COUNTS, { variables: { eventId }, skip: skip || !eventId, fetchPolicy: 'cache-and-network' });
	const checkedIn: number = counts?.used?.metaCounter?.[0]?.total ?? 0;
	const attendeeTotal: number = counts?.all?.metaCounter?.[0]?.total ?? 0;

	const [manual, setManual] = useState('');
	const [shown, setShown] = useState<Shown | null>(null);
	const [busy, setBusy] = useState(false);
	const [recent, setRecent] = useState<ScanEntry[]>([]);
	const last = useRef<{ token: string; at: number }>({ token: '', at: 0 });
	const busyRef = useRef(false);
	const counter = useRef(0);
	const resultRef = useRef<HTMLDivElement>(null);

	const place = useCallback(
		(seat?: { sectionKey: string; row: number; number: number } | null, typeName?: string | null) =>
			seat ? String(t('checkin.seat', { section: sectionNames.get(seat.sectionKey) ?? seat.sectionKey, row: seat.row, number: seat.number })) : typeName || String(t('checkin.general')),
		[t, sectionNames],
	);

	const submit = useCallback(
		async (raw: string, source: 'camera' | 'manual') => {
			if (!eventId || busyRef.current) return;
			// The camera always sends the QR text as it is. The manual box takes a QR token or a ticket code (spaces and dashes allowed).
			const manualEntry = source === 'manual' ? readManual(raw) : null;
			if (manualEntry?.kind === 'empty') return;
			const token = cleanToken(raw);
			if (source === 'camera' && !token) return;
			if (manualEntry?.kind === 'invalid') {
				setShown({ outcome: 'badCode' });
				resultRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
				return;
			}
			const now = Date.now();
			if (source === 'camera' && last.current.token === token && now - last.current.at < REPEAT_MS) return;
			last.current = { token, at: now };
			busyRef.current = true;
			setBusy(true);
			let entry: Shown;
			try {
				const byCode = manualEntry?.kind === 'code';
				const res = byCode
					? await client.mutate({ mutation: CHECK_IN_TICKET_BY_CODE, variables: { input: { eventId, ticketCode: manualEntry.value } } })
					: await client.mutate({ mutation: CHECK_IN_TICKET, variables: { qrToken: manualEntry?.kind === 'token' ? manualEntry.value : token, eventId } });
				const r = byCode ? res.data?.checkInTicketByCode : res.data?.checkInTicket;
				entry = { outcome: 'valid', buyer: r?.buyerName, place: place(r?.seat, r?.ticketTypeName), code: r?.ticket?.ticketCode };
				void refetchCounts();
			} catch (err) {
				const { outcome, raw: message, retryAfterSeconds } = classifyScan(err);
				entry = { outcome, raw: message, retryAfterSeconds };
			} finally {
				busyRef.current = false;
				setBusy(false);
			}
			setShown(entry);
			setRecent((list) => [{ id: ++counter.current, at: Date.now(), ...entry }, ...list].slice(0, RECENT_MAX));
			if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(entry.outcome === 'valid' ? 80 : [120, 60, 120]);
			if (source === 'manual') setManual('');
			resultRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		},
		[client, eventId, place, refetchCounts],
	);

	useEffect(() => {
		last.current = { token: '', at: 0 };
	}, [eventId]);

	if (organizerAccess && !active) return <BlockedPanel access={organizerAccess} action="events" />;

	const time = (at: number) => new Intl.DateTimeFormat(locale === 'uz' ? 'en-GB' : locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(at));
	const percent = attendeeTotal > 0 ? Math.min(100, Math.round((checkedIn / attendeeTotal) * 100)) : 0;
	const firstLoad = !data && loading;

	return (
		<div className="org-page org-checkin">
			<Head>
				<title>{`${t('checkin.title')} · Ticketzy`}</title>
			</Head>
			<div className="tz-pagehead org-pagehead">
				<div>
					<h1>{t('checkin.title')}</h1>
					<p>{t('checkin.subtitle')}</p>
				</div>
			</div>

			{error && !data ? (
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('checkin.error.title')}
					text={t('checkin.error.text')}
					actions={
						<Button variant="outlined" onClick={() => refetch()}>
							{t('errors.retry')}
						</Button>
					}
				/>
			) : firstLoad ? (
				<span className="tz-skel tz-skel--block" aria-busy="true" aria-label={t('checkin.loading')} />
			) : events.length === 0 ? (
				<StateBlock
					icon={<Calendar size={28} />}
					title={t('checkin.noEvents.title')}
					text={t('checkin.noEvents.text')}
					actions={
						<Button component={Link} href={organizerEventsUrl} variant="outlined">
							{t('checkin.noEvents.action')}
						</Button>
					}
				/>
			) : (
				<>
					<div className="tz-field">
						<label className="tz-field__label" htmlFor="checkin-event">
							{t('checkin.event')}
						</label>
						<select id="checkin-event" className="tz-input" value={eventId} onChange={(e) => chooseEvent(e.target.value)}>
							<option value="">{t('checkin.choose')}</option>
							{events.map((event) => (
								<option key={event._id} value={event._id}>
									{localizedEvent(event, locale).title} · {formatEventWhen(event.startAt, event.endAt, locale, event.venueData?.venueTimezone)}
								</option>
							))}
						</select>
					</div>

					{!selected ? (
						<p className="tz-alert tz-alert--info" role="note">
							<Calendar size={20} aria-hidden="true" />
							<span>{t('checkin.chooseFirst')}</span>
						</p>
					) : (
						<div className="org-checkin__cols">
							<div className="org-checkin__main">
								<Scanner disabled={busy} onScan={(text) => void submit(text, 'camera')} />

								<form className="org-card org-manual" onSubmit={(e: FormEvent) => { e.preventDefault(); void submit(manual, 'manual'); }}>
									<label className="tz-field__label" htmlFor="checkin-manual">
										{t('checkin.manual.label')}
									</label>
									<input
										id="checkin-manual"
										className="tz-input org-mono"
										value={manual}
										onChange={(e) => setManual(e.target.value)}
										placeholder={t('checkin.manual.placeholder')}
										autoComplete="off"
										autoCapitalize="off"
										autoCorrect="off"
										spellCheck={false}
										inputMode="text"
										aria-describedby="checkin-manual-hint"
									/>
									<span id="checkin-manual-hint" className="tz-field__hint">{t('checkin.manual.hint')}</span>
									<Button type="submit" variant="outlined" disabled={busy || !cleanToken(manual)}>
										{busy ? t('checkin.checking') : t('checkin.manual.submit')}
									</Button>
								</form>
							</div>

							<div className="org-checkin__side">
								<div ref={resultRef} aria-live="polite">
									{shown ? <ScanResult {...shown} /> : <p className="org-hint org-result-empty">{t('checkin.waiting')}</p>}
								</div>

								<section className="org-card" aria-labelledby="checkin-count">
									<div className="org-card__head">
										<h2 id="checkin-count">{t('checkin.count')}</h2>
										<span className="org-count">
											<strong>{formatNumber(checkedIn, locale)}</strong> {t('checkin.of', { total: formatNumber(attendeeTotal, locale) })}
										</span>
									</div>
									<div className="org-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t('checkin.count')}>
										<span style={{ width: `${percent}%` }} />
									</div>
								</section>

								<section className="org-card" aria-labelledby="checkin-recent">
									<div className="org-card__head">
										<h2 id="checkin-recent">{t('checkin.recent')}</h2>
									</div>
									{recent.length === 0 ? (
										<p className="org-hint">{t('checkin.recentEmpty')}</p>
									) : (
										<ul className="org-recent">
											{recent.map((entry) => (
												<li key={entry.id}>
													<div>
														<strong>{entry.buyer || t(`checkin.result.${entry.outcome}.title`)}</strong>
														<span className="org-row__meta">{[entry.place, time(entry.at)].filter(Boolean).join(' · ')}</span>
													</div>
													<span className={`tz-badge tz-badge--${entry.outcome === 'valid' ? 'success' : entry.outcome === 'used' || entry.outcome === 'refunded' || entry.outcome === 'invalid' ? 'danger' : 'warning'}`}>
														{t(`checkin.badge.${entry.outcome}`)}
													</span>
												</li>
											))}
										</ul>
									)}
									<p className="org-hint">{t('checkin.recentNote')}</p>
								</section>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default withOrganizerLayout(CheckIn);
