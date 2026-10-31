import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Router, { useRouter } from 'next/router';
import { isSamePageOtherLocale } from '../../i18n';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useApolloClient } from '@apollo/client';
import { useTranslation } from 'next-i18next';
import { Button } from '@mui/material';
import { Warning, WifiHigh } from 'phosphor-react';
import { CANCEL_PENDING_ORDER, RELEASE_SEATS } from '../../../apollo/user/mutation';
import { GET_MY_PENDING_ORDERS } from '../../../apollo/user/query';
import { clearSession } from '../../auth';
import { parseApiError } from '../../errors';
import { ticketAvailability } from '../../events';
import { formatPrice } from '../../format';
import { useSeatMap as useSeatMapData } from '../../hooks/useSeatMap';
import { holdAndCheckout } from '../../seats/checkout';
import { serverNow } from '../../seats/clock';
import { checkoutErrorKey, isSeatConflict } from '../../seats/errors';
import { compareSeats, seatKey, takenMap, tierColor, tierIndexes, totalSeats } from '../../seats/layout';
import { SeatConfig, SeatRef } from '../../seats/types';
import { seatVisual } from '../../seats/visual';
import { checkoutUrl } from '../../routes';
import { TicketTypeItem } from '../../types/event';
import Countdown from './Countdown';
import { isNonRefundable, RefundPolicy } from '../../refundPolicy';
import RefundPolicyNote from '../events/RefundPolicyNote';
import RefundAck from './RefundAck';
import SeatSummary, { SummaryLine } from './SeatSummary';
import { SeatGrid, SectionInfo, SectionList } from './SectionList';
import { GetMyOrdersVars, ListResult } from '../../types/queries';
// The map (SVG, zoom and pan) is the heaviest part of the page and only needed once the seats are known
const SeatMap = dynamic(() => import('./SeatMap'), {
	ssr: false,
	loading: () => <div className="seatmap seatmap--loading tz-skel" aria-hidden="true" />,
});

interface Props {
	eventId: string;
	ticketTypes: TicketTypeItem[];
	config: SeatConfig;
	refundPolicy?: Partial<RefundPolicy> | null;
	startAt: string;
	timeZone?: string | null;
}

type Notice =
	| { kind: 'taken'; seats: SeatRef[] }
	| { kind: 'conflict'; seats: SeatRef[] }
	| { kind: 'expired' }
	| { kind: 'released' }
	| { kind: 'max' }
	| { kind: 'soldOut' }
	| { kind: 'error'; key: string };

interface PendingOrder {
	_id: string;
	expiresAt: string;
}

/** The interactive seat map with its summary, polling and hold. */
const SeatPicker = ({ eventId, ticketTypes, config, refundPolicy, startAt, timeZone }: Props) => {
	const { t } = useTranslation('checkout');
	const { locale, push, events: routerEvents } = useRouter();
	const client = useApolloClient();
	const { data: map, error: mapError, live, loaded, refresh } = useSeatMapData(eventId, true);

	const [selected, setSelected] = useState<SeatRef[]>([]);
	const [notice, setNotice] = useState<Notice | null>(null);
	const [busy, setBusy] = useState(false);
	const [active, setActive] = useState<string | null>(null);
	const [focus, setFocus] = useState<string | null>(null);
	const [pending, setPending] = useState<PendingOrder | null>(null);
	/** Non-refundable event: the buyer has to confirm before the seats are held and the order is made */
	const nonRefundable = isNonRefundable({ refundPolicy });
	const [acknowledged, setAcknowledged] = useState(false);
	const needsAck = nonRefundable && !acknowledged;
	const busyRef = useRef(false);
	const handoff = useRef(false);

	const sections = useMemo(() => map?.venueLayout.sections ?? [], [map]);
	const taken = useMemo(() => takenMap(map?.seats ?? []), [map]);
	const tiers = useMemo(() => tierIndexes(sections), [sections]);
	const selectedKeys = useMemo(() => new Set(selected.map(seatKey)), [selected]);
	const ticketByTier = useMemo(() => {
		const byTier = new Map<string, TicketTypeItem>();
		ticketTypes.forEach((tt) => tt.tierKey && byTier.set(tt.tierKey, tt));
		return byTier;
	}, [ticketTypes]);
	const currency = ticketTypes[0]?.ticketCurrency ?? 'KRW';

	const mine = useMemo(() => (map?.seats ?? []).filter((seat) => seat.mine && seat.seatStatus === 'HELD'), [map]);
	const holdDeadline = useMemo(() => {
		const times = mine.map((seat) => seat.holdExpiresAt).filter(Boolean) as string[];
		return times.length ? times.reduce((a, b) => (new Date(a) < new Date(b) ? a : b)) : null;
	}, [mine]);

	/** SECTIONS **/
	const lockedTiers = useMemo(() => {
		const locked = new Set<string>();
		sections.forEach((section) => {
			if (section.kind !== 'SEATED' || !section.tierKey) return;
			const tt = ticketByTier.get(section.tierKey);
			if (!tt || ticketAvailability(tt) !== 'available') locked.add(section.tierKey);
		});
		return locked;
	}, [sections, ticketByTier]);

	const sectionInfo: SectionInfo[] = useMemo(
		() =>
			sections.map((section) => {
				const total = totalSeats(section);
				const gone = (map?.seats ?? []).filter((seat) => seat.sectionKey === section.key && !seat.mine).length;
				const tt = section.tierKey ? ticketByTier.get(section.tierKey) : undefined;
				return {
					section,
					tierIndex: section.tierKey ? tiers.get(section.tierKey) : undefined,
					price: tt?.ticketPrice,
					ticketName: tt?.ticketTypeName,
					currency: tt?.ticketCurrency,
					free: Math.max(0, total - gone),
					total,
					locked: Boolean(section.tierKey && lockedTiers.has(section.tierKey)),
				};
			}),
		[sections, map, ticketByTier, tiers, lockedTiers],
	);
	const allGone = sectionInfo.length > 0 && sectionInfo.every((info) => info.section.kind === 'STANDING' || info.free === 0);
	const sectionOf = useCallback((key: string) => sections.find((section) => section.key === key), [sections]);
	const priceOf = useCallback(
		(ref: SeatRef) => {
			const tierKey = sectionOf(ref.sectionKey)?.tierKey;
			return (tierKey ? ticketByTier.get(tierKey)?.ticketPrice : undefined) ?? 0;
		},
		[sectionOf, ticketByTier],
	);
	const seatText = useCallback((ref: SeatRef) => `${sectionOf(ref.sectionKey)?.name ?? ref.sectionKey} · ${t('seat.label', { row: ref.row, number: ref.number })}`, [sectionOf, t]);

	/** PENDING ORDER (resume after a back button or a reload) **/
	useEffect(() => {
		let cancelled = false;
		client
			.query<{ getMyOrders: ListResult<{ _id: string; eventId: string; expiresAt: string }> }, GetMyOrdersVars>({
				query: GET_MY_PENDING_ORDERS,
				variables: { input: { page: 1, limit: 10, orderStatus: 'PENDING_PAYMENT' } },
				fetchPolicy: 'network-only',
			})
			.then(({ data }) => {
				if (cancelled) return;
				const order = data.getMyOrders.list.find(
					(item) => item.eventId === eventId && new Date(item.expiresAt).getTime() > serverNow(),
				);
				if (order) setPending({ _id: order._id, expiresAt: order.expiresAt });
			})
			.catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, [client, eventId]);

	/** MAP UPDATES: restore my hold after a reload, drop seats that were taken, notice a hold that ended **/
	const restored = useRef(false);
	const previousMine = useRef(new Set<string>());
	const holdEnded = useRef(false);
	useEffect(() => {
		if (!map) return;
		const mineKeys = new Set(mine.map(seatKey));

		if (!restored.current) {
			restored.current = true;
			if (mine.length > 0) setSelected(mine.map(({ sectionKey, row, number }) => ({ sectionKey, row, number })).sort(compareSeats));
			previousMine.current = mineKeys;
			return;
		}

		// A seat of the selection that someone else now holds or bought
		const lost = selected.filter((ref) => {
			const seat = taken.get(seatKey(ref));
			return seat && !seat.mine;
		});
		if (lost.length > 0) {
			setSelected((current) => current.filter((ref) => !lost.some((l) => seatKey(l) === seatKey(ref))));
			setNotice({ kind: 'taken', seats: lost });
		}

		// Seats that were mine and are free again: the hold ended (timer) or was released elsewhere (other tab)
		const vanished = Array.from(previousMine.current).filter((key) => !mineKeys.has(key) && !taken.has(key));
		if (vanished.length > 0 && selected.some((ref) => vanished.includes(seatKey(ref)))) {
			setSelected((current) => current.filter((ref) => !vanished.includes(seatKey(ref))));
			setNotice((current) => (current && (current.kind === 'taken' || current.kind === 'expired') ? current : { kind: holdEnded.current ? 'expired' : 'released' }));
		}
		if (mineKeys.size > 0) holdEnded.current = false;
		previousMine.current = mineKeys;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [map]);

	const onHoldExpired = useCallback(() => {
		holdEnded.current = true;
		const heldKeys = new Set(mine.map(seatKey));
		setSelected((current) => current.filter((ref) => !heldKeys.has(seatKey(ref))));
		setNotice({ kind: 'expired' });
		refresh();
	}, [mine, refresh]);

	const onPendingExpired = useCallback(() => {
		setPending(null);
		setNotice({ kind: 'expired' });
		refresh();
	}, [refresh]);

	/** SELECTION **/
	const toggle = useCallback(
		(ref: SeatRef) => {
			if (pending) return;
			const section = sectionOf(ref.sectionKey);
			if (!section || section.kind !== 'SEATED') return;
			if (section.tierKey && lockedTiers.has(section.tierKey)) return;
			const key = seatKey(ref);
			const seat = taken.get(key);
			if (seat && !seat.mine) return;
			setNotice((current) => (current?.kind === 'max' || current?.kind === 'error' ? null : current));
			setSelected((current) => {
				if (current.some((item) => seatKey(item) === key)) return current.filter((item) => seatKey(item) !== key);
				if (current.length >= config.maxSeatsPerOrder) {
					setNotice({ kind: 'max' });
					return current;
				}
				return [...current, ref].sort(compareSeats);
			});
		},
		[pending, sectionOf, lockedTiers, taken, config.maxSeatsPerOrder],
	);

	const pickSection = (key: string) => {
		setActive(key);
		setFocus(null);
		window.setTimeout(() => setFocus(key), 0);
	};

	const tooltip = useCallback(
		(key: string) => {
			const [sectionKey, row, number] = key.split(':');
			const ref = { sectionKey, row: Number(row), number: Number(number) };
			const state = seatVisual(taken.get(key), selectedKeys.has(key), Boolean(lockedTiers.has(sectionOf(sectionKey)?.tierKey ?? '')));
			return `${seatText(ref)} · ${t(`state.${state}`)}${state === 'available' || state === 'selected' ? ` · ${formatPrice(priceOf(ref), locale, currency)}` : ''}`;
		},
		[taken, selectedKeys, lockedTiers, sectionOf, seatText, t, priceOf, locale, currency],
	);

	/** CONTINUE: hold, then create the order, then go to payment **/
	const goOn = async () => {
		if (busyRef.current || selected.length === 0 || pending || needsAck) return;
		busyRef.current = true;
		setBusy(true);
		setNotice(null);
		try {
			const orderId = await holdAndCheckout(client, eventId, selected, nonRefundable ? true : undefined);
			handoff.current = true;
			await push(checkoutUrl(orderId));
		} catch (err) {
			const error = parseApiError(err);
			const known = checkoutErrorKey(error);
			if (known.auth) {
				clearSession();
				return;
			}
			if (isSeatConflict(error) || error.message === 'Seat not found!') {
				// The server does not say which seat failed: read the fresh map and name the ones that are gone
				const fresh = await refresh();
				const freshTaken = takenMap(fresh?.seats ?? []);
				const lost = selected.filter((ref) => {
					const seat = freshTaken.get(seatKey(ref));
					return seat && !seat.mine;
				});
				setSelected((current) => current.filter((ref) => !lost.some((l) => seatKey(l) === seatKey(ref))));
				setNotice({ kind: 'conflict', seats: lost });
			} else {
				refresh();
				setNotice({ kind: 'error', key: known.key });
			}
		} finally {
			busyRef.current = false;
			if (!handoff.current) setBusy(false);
		}
	};

	const release = async () => {
		if (busyRef.current) return;
		busyRef.current = true;
		setBusy(true);
		try {
			await client.mutate({ mutation: RELEASE_SEATS, variables: { eventId } });
			setSelected([]);
			setNotice(null);
			await refresh();
		} catch (err) {
			const known = checkoutErrorKey(parseApiError(err));
			if (known.auth) clearSession();
			else setNotice({ kind: 'error', key: known.key });
		} finally {
			busyRef.current = false;
			setBusy(false);
		}
	};

	const dropPending = async () => {
		if (!pending || busyRef.current) return;
		busyRef.current = true;
		setBusy(true);
		try {
			await client.mutate({ mutation: CANCEL_PENDING_ORDER, variables: { orderId: pending._id } });
		} catch {
			// already expired or paid elsewhere: the map shows the truth below
		}
		setPending(null);
		setSelected([]);
		await refresh();
		busyRef.current = false;
		setBusy(false);
	};

	/** LEAVING: seats held by this page go back when the buyer navigates inside the app. A reload keeps them (restored on load). **/
	const leaveState = useRef({ held: false });
	leaveState.current.held = mine.length > 0 && !pending;
	useEffect(() => {
		const onLeave = (url: string) => {
			// A language switch is a route change to this same page: the hold stays (F374)
			if (isSamePageOtherLocale(url, Router.asPath)) return;
			if (handoff.current || !leaveState.current.held) return;
			client.mutate({ mutation: RELEASE_SEATS, variables: { eventId } }).catch(() => undefined);
		};
		routerEvents.on('routeChangeStart', onLeave);
		return () => routerEvents.off('routeChangeStart', onLeave);
	}, [client, eventId, routerEvents]);

	/** RENDER **/
	const lines: SummaryLine[] = selected.map((ref) => ({
		key: seatKey(ref),
		title: t('seat.label', { row: ref.row, number: ref.number }),
		meta: sectionOf(ref.sectionKey)?.name ?? ref.sectionKey,
		price: priceOf(ref),
		onRemove: pending ? undefined : () => toggle(ref),
		removeLabel: t('summary.remove', { seat: seatText(ref) }),
	}));
	const total = selected.reduce((sum, ref) => sum + priceOf(ref), 0);
	const activeInfo = sectionInfo.find((info) => info.section.key === active);

	if (mapError && !map) {
		const known = checkoutErrorKey(mapError);
		return (
			<div className="tz-alert tz-alert--danger" role="alert">
				<span className="tz-alert__icon">
					<Warning size={18} />
				</span>
				<div>
					<p className="tz-alert__title">{t(mapError.code === 'NO_DATA_FOUND' || mapError.message === 'No data found!' ? 'map.unavailable' : known.key)}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="picker">
			<div className="picker__main">
				{notice && <NoticeBox notice={notice} seatText={seatText} max={config.maxSeatsPerOrder} onClose={() => setNotice(null)} />}
				{allGone && loaded && (
					<div className="tz-alert tz-alert--warning" role="status">
						<span className="tz-alert__icon">
							<Warning size={18} />
						</span>
						<p className="tz-alert__title">{t('notices.allGone')}</p>
					</div>
				)}
				{pending && (
					<div className="tz-alert tz-alert--warning pending" role="status">
						<div className="pending__body">
							<Countdown deadline={pending.expiresAt} totalSeconds={config.seatHoldSeconds} title={t('pending.title')} text={t('pending.text')} onExpire={onPendingExpired} />
							<div className="pending__actions">
								<Button component={Link} href={checkoutUrl(pending._id)} variant="contained">
									{t('pending.resume')}
								</Button>
								<Button variant="outlined" onClick={dropPending} disabled={busy}>
									{t('pending.change')}
								</Button>
							</div>
						</div>
					</div>
				)}

				<div className="picker__live" aria-live="off">
					<span className={`live${live ? ' is-live' : ' is-off'}`}>
						<WifiHigh size={16} aria-hidden="true" /> {live ? t('map.live') : loaded ? t('map.reconnecting') : t('map.loading')}
					</span>
				</div>

				{!map ? (
					<div className="seatmap__skeleton tz-skel" aria-busy="true" aria-label={t('map.loading')} />
				) : (
					<SeatMap
						focalArea={map?.venueLayout.focalArea}
						sections={sections}
						tiers={tiers}
						taken={taken}
						selected={selectedKeys}
						lockedTiers={lockedTiers}
						activeSection={active}
						focusSection={focus}
						tooltip={tooltip}
						onSeat={toggle}
						onSection={pickSection}
					/>
				)}

				<Legend sectionInfo={sectionInfo} />

				{map && (
					<section className="picker__sections" aria-labelledby="sections-title">
						<h2 id="sections-title" className="picker__h">
							{t('sections.title')}
						</h2>
						<p className="picker__hint">{t('sections.hint')}</p>
						<SectionList items={sectionInfo} active={active} onPick={pickSection} />
						{activeInfo && activeInfo.section.kind === 'SEATED' && (
							<>
								<h3 className="picker__h picker__h--sub">{t('grid.title', { section: activeInfo.section.name })}</h3>
								<SeatGrid info={activeInfo} taken={taken} selected={selectedKeys} onSeat={toggle} disabled={Boolean(pending)} />
							</>
						)}
					</section>
				)}
			</div>

			<SeatSummary
				heading={t('summary.title')}
				lines={lines}
				count={selected.length}
				total={total}
				currency={currency}
				note={t('summary.max', { count: config.maxSeatsPerOrder })}
				empty={t('summary.empty')}
				timer={
					holdDeadline && !pending ? (
						<Countdown deadline={holdDeadline} totalSeconds={config.seatHoldSeconds} title={t('hold.left')} text={t('hold.text')} onExpire={onHoldExpired} />
					) : (
						<div className="countdown countdown--idle">
							<p className="countdown__text">{t('hold.idle', { seconds: config.seatHoldSeconds })}</p>
						</div>
					)
				}
				action={{
					label: t('summary.continue'),
					busyLabel: t('summary.holding'),
					busy,
					// really disabled (not only marked) until the non-refundable box is ticked: no click, no request
					disabled: Boolean(pending) || (needsAck && selected.length > 0),
					blocked: selected.length === 0,
					hint: t('summary.selectHint'),
					onClick: goOn,
				}}
				policy={<RefundPolicyNote policy={refundPolicy} startAt={startAt} timeZone={timeZone} className="tz-refund--compact" />}
				gate={nonRefundable ? <RefundAck checked={acknowledged} onChange={setAcknowledged} disabled={busy} /> : undefined}
				secondary={
					mine.length > 0 && !pending ? (
						<Button variant="text" onClick={release} disabled={busy}>
							{t('hold.release')}
						</Button>
					) : undefined
				}
			/>
		</div>
	);
};

const NoticeBox = ({
	notice,
	seatText,
	max,
	onClose,
}: {
	notice: Notice;
	seatText: (ref: SeatRef) => string;
	max: number;
	onClose: () => void;
}) => {
	const { t } = useTranslation('checkout');
	const seats = 'seats' in notice ? notice.seats : [];
	const title =
		notice.kind === 'taken'
			? t('notices.taken', { count: seats.length })
			: notice.kind === 'conflict'
			? t(seats.length > 0 ? 'notices.conflict' : 'notices.conflictUnknown', { count: seats.length })
			: notice.kind === 'expired'
			? t('notices.expired')
			: notice.kind === 'released'
			? t('notices.released')
			: notice.kind === 'max'
			? t('notices.max', { count: max })
			: notice.kind === 'soldOut'
			? t('notices.allGone')
			: t(notice.key);
	const danger = notice.kind === 'error' || notice.kind === 'conflict';
	return (
		<div className={`tz-alert tz-alert--${danger ? 'danger' : 'warning'}`} role="alert">
			<span className="tz-alert__icon">
				<Warning size={18} />
			</span>
			<div className="notice__body">
				<p className="tz-alert__title">{title}</p>
				{seats.length > 0 && (
					<ul className="notice__list">
						{seats.map((ref) => (
							<li key={seatKey(ref)}>{seatText(ref)}</li>
						))}
					</ul>
				)}
				{notice.kind === 'expired' && <p className="tz-alert__text">{t('notices.expiredText')}</p>}
				{(notice.kind === 'taken' || notice.kind === 'conflict') && <p className="tz-alert__text">{t('notices.pickOthers')}</p>}
			</div>
			<button type="button" className="notice__close" onClick={onClose} aria-label={t('notices.dismiss')}>
				×
			</button>
		</div>
	);
};

const Legend = ({ sectionInfo }: { sectionInfo: SectionInfo[] }) => {
	const { t } = useTranslation('checkout');
	const { locale } = useRouter();
	const tiers = new Map<number, SectionInfo>();
	sectionInfo.forEach((info) => {
		if (info.tierIndex !== undefined && !tiers.has(info.tierIndex)) tiers.set(info.tierIndex, info);
	});
	return (
		<div className="legend">
			<div>
				<h2 className="legend__title">{t('legend.status')}</h2>
				<ul className="legend__list">
					{(['available', 'selected', 'mine', 'held', 'sold'] as const).map((state) => (
						<li key={state}>
							<span className={`legend__seat legend__seat--${state}`} aria-hidden="true" />
							{t(`state.${state}`)}
						</li>
					))}
				</ul>
			</div>
			<div>
				<h2 className="legend__title">{t('legend.tier')}</h2>
				<ul className="legend__list">
					{Array.from(tiers.entries()).map(([index, info]) => (
						<li key={index}>
							<span className="legend__seat" style={{ background: tierColor(index) }} aria-hidden="true" />
							{info.ticketName ?? info.section.name} {info.price !== undefined && `· ${formatPrice(info.price, locale, info.currency)}`}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
};

export default SeatPicker;
