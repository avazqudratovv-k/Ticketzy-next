import { useEffect, useMemo, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Lock, MagnifyingGlass, MapPin, Plus, WarningCircle } from 'phosphor-react';
import { withOrganizerLayout } from '../../../libs/components/layout/LayoutAdmin';
import StateBlock from '../../../libs/components/states/StateBlock';
import Pagination from '../../../libs/components/events/Pagination';
import BlockedPanel from '../../../libs/components/organizer/BlockedPanel';
import useAuth from '../../../libs/hooks/useAuth';
import useUrlState from '../../../libs/hooks/useUrlState';
import useMyVenues, { hasSeats } from '../../../libs/venues/useVenueData';
import { formatNumber, formatZoneName } from '../../../libs/format';
import { NETWORK_ERROR, parseApiError } from '../../../libs/errors';
import { organizerVenueEditUrl, organizerVenueNewUrl } from '../../../libs/routes';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common', 'organizer', 'events'])),
	},
});

const PAGE_SIZE = 10;
const SORTS = ['newest', 'name', 'capacity'] as const;
type Sort = (typeof SORTS)[number];

const OrganizerVenues: NextPage = () => {
	const { t } = useTranslation('organizer');
	const router = useRouter();
	const { locale } = router;
	const { user, organizerAccess } = useAuth();
	const active = organizerAccess === 'active';
	const { page, value: q, update, ready } = useUrlState('q');
	const sortParam = typeof router.query.sort === 'string' ? router.query.sort : '';
	const sort: Sort = (SORTS as readonly string[]).includes(sortParam) ? (sortParam as Sort) : 'newest';
	const [search, setSearch] = useState(q);
	const { venues, byVenue, loading, error, reload } = useMyVenues(active ? user?._id : undefined);

	useEffect(() => setSearch(q), [q]);
	useEffect(() => {
		if (search === q) return undefined;
		const id = window.setTimeout(() => update({ value: search }), 300);
		return () => window.clearTimeout(id);
	}, [search, q, update]);

	const filtered = useMemo(() => {
		const text = q.trim().toLowerCase();
		const list = (venues ?? []).filter((venue) => !text || `${venue.venueName} ${venue.venueCity} ${venue.venueAddress}`.toLowerCase().includes(text));
		const sorted = [...list];
		if (sort === 'name') sorted.sort((a, b) => a.venueName.localeCompare(b.venueName, locale));
		else if (sort === 'capacity') sorted.sort((a, b) => b.venueCapacity - a.venueCapacity);
		return sorted;
	}, [venues, q, sort, locale]);
	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const current = Math.min(page, pageCount);
	const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

	useEffect(() => {
		if (venues && page > pageCount) update({ page: pageCount });
	}, [venues, page, pageCount, update]);

	if (organizerAccess && !active) return <BlockedPanel access={organizerAccess} action="venues" />;

	const network = error ? parseApiError(error).code === NETWORK_ERROR : false;
	const firstLoad = !venues && loading;
	const nowIso = new Date().toISOString();

	return (
		<div className="org-page">
			<Head>
				<title>{`${t('venues.list.title')} · Ticketzy`}</title>
			</Head>
			<div className="tz-pagehead org-pagehead">
				<div>
					<h1>{t('venues.list.title')}</h1>
					<p>{t('venues.list.subtitle')}</p>
				</div>
				<Button component={Link} href={organizerVenueNewUrl} variant="contained" startIcon={<Plus size={20} aria-hidden="true" />}>
					{t('venues.list.create')}
				</Button>
			</div>

			<div className="org-toolbar">
				<label className="org-search">
					<MagnifyingGlass size={20} aria-hidden="true" />
					<span className="org-visually-hidden">{t('venues.list.search')}</span>
					<input type="search" className="tz-input" value={search} placeholder={t('venues.list.searchPlaceholder')} maxLength={100} onChange={(event) => setSearch(event.target.value)} />
				</label>
				<label className="org-select">
					<span className="org-visually-hidden">{t('list.sort')}</span>
					<select
						className="tz-input"
						value={sort}
						onChange={(event) => {
							const query: Record<string, string> = {};
							if (q) query.q = q;
							if (event.target.value !== 'newest') query.sort = event.target.value;
							void router.push({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false });
						}}
					>
						{SORTS.map((key) => (
							<option key={key} value={key}>
								{t(`venues.list.sorts.${key}`)}
							</option>
						))}
					</select>
				</label>
			</div>

			{error && !venues ? (
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('venues.list.error.title')}
					text={network ? t('errors.network') : t('venues.list.error.text')}
					actions={
						<Button variant="outlined" onClick={() => void reload()}>
							{t('errors.retry')}
						</Button>
					}
				/>
			) : firstLoad || !ready ? (
				<ul className="org-rows" aria-busy="true" aria-label={t('venues.list.loading')}>
					{[0, 1, 2, 3].map((n) => (
						<li key={n} className="org-row">
							<span className="tz-skel tz-skel--block" />
						</li>
					))}
				</ul>
			) : (venues ?? []).length === 0 ? (
				<StateBlock
					icon={<MapPin size={28} />}
					title={t('venues.list.empty.title')}
					text={t('venues.list.empty.text')}
					actions={
						<Button component={Link} href={organizerVenueNewUrl} variant="contained">
							{t('venues.list.create')}
						</Button>
					}
				/>
			) : filtered.length === 0 ? (
				<StateBlock
					icon={<MagnifyingGlass size={28} />}
					title={t('venues.list.none.title')}
					text={t('venues.list.none.text')}
					actions={
						<Button variant="outlined" onClick={() => update({ value: '' })}>
							{t('venues.list.none.clear')}
						</Button>
					}
				/>
			) : (
				<>
					<div className="org-table vl" role="table" aria-label={t('venues.list.title')}>
						<div className="org-row org-row--head vl__row" role="row">
							<span role="columnheader">{t('venues.list.cols.venue')}</span>
							<span role="columnheader">{t('venues.list.cols.city')}</span>
							<span role="columnheader">{t('venues.list.cols.timezone')}</span>
							<span role="columnheader" className="org-num">
								{t('venues.list.cols.capacity')}
							</span>
							<span role="columnheader" className="org-num">
								{t('venues.list.cols.events')}
							</span>
							<span role="columnheader">{t('venues.list.cols.actions')}</span>
						</div>
						{rows.map((venue) => {
							const events = byVenue.get(venue._id) ?? [];
							const locked = events.some(hasSeats);
							return (
								<div className="org-row vl__row" role="row" key={venue._id}>
									<div role="cell" className="org-row__event">
										<Link href={organizerVenueEditUrl(venue._id)} className="org-row__title">
											{venue.venueName}
										</Link>
										<span className="org-row__meta">{venue.venueAddress}</span>
										<span className="org-row__meta">{t(`venues.types.${venue.venueType}`)}</span>
									</div>
									<div role="cell">
										<span className="org-row__label">{t('venues.list.cols.city')}</span>
										{venue.venueCity}
									</div>
									<div role="cell" className="vl__zone">
										<span className="org-row__label">{t('venues.list.cols.timezone')}</span>
										{venue.venueTimezone} <span className="org-row__meta">({formatZoneName(nowIso, locale, venue.venueTimezone)})</span>
									</div>
									<div role="cell" className="org-num">
										<span className="org-row__label">{t('venues.list.cols.capacity')}</span>
										{formatNumber(venue.venueCapacity, locale)}
									</div>
									<div role="cell" className="org-num">
										<span className="org-row__label">{t('venues.list.cols.events')}</span>
										{formatNumber(events.length, locale)}
										{locked && (
											<span className="vl__lock" title={t('venues.list.lockedTip')}>
												<Lock size={14} aria-hidden="true" /> {t('venues.list.locked')}
											</span>
										)}
									</div>
									<div role="cell" className="org-row__actions">
										<Link href={organizerVenueEditUrl(venue._id)} className="tz-link">
											{locked ? t('venues.list.view') : t('venues.list.edit')}
										</Link>
									</div>
								</div>
							);
						})}
					</div>
					<div className="org-foot">
						<p>
							{t('venues.list.showing', {
								from: formatNumber((current - 1) * PAGE_SIZE + 1, locale),
								to: formatNumber((current - 1) * PAGE_SIZE + rows.length, locale),
								total: formatNumber(filtered.length, locale),
							})}
						</p>
						<Pagination page={current} pageCount={pageCount} onChange={(next) => update({ page: next })} />
					</div>
					<p className="org-hint">{t('venues.list.note')}</p>
				</>
			)}
		</div>
	);
};

export default withOrganizerLayout(OrganizerVenues);
