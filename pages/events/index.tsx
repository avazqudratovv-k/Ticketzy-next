import { useEffect, useMemo, useRef, useState } from 'react';
import { NextPage } from 'next';
import { useQuery } from '@apollo/client';
import { Button, MenuItem, Select } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Check, FunnelSimple, MagnifyingGlass, SquaresFour, WarningCircle } from 'phosphor-react';
import { GET_EVENTS, GET_VENUES } from '../../apollo/user/query';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import Seo from '../../libs/components/common/Seo';
import BuyerNoticeBanner from '../../libs/components/events/BuyerNoticeBanner';
import StateBlock from '../../libs/components/states/StateBlock';
import EventCard, { EventGridSkeleton } from '../../libs/components/events/EventCard';
import Pagination from '../../libs/components/events/Pagination';
import { categoryIcon } from '../../libs/components/events/CategoryChip';
import { CATEGORY_SLUGS, EventSortKey, EVENT_SORTS } from '../../libs/events';
import { buildEventsInput, PAGE_SIZE, useEventFilters } from '../../libs/hooks/useEventFilters';
import { formatNumber } from '../../libs/format';
import { EventItem } from '../../libs/types/event';
import { useRouter } from 'next/router';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common', 'events'])),
	},
});

/** A text or number field that writes to the URL a moment after typing stops. */
function useDebouncedCommit(value: string, commit: (next: string) => void, delay = 400) {
	const [draft, setDraft] = useState(value);
	const latest = useRef(commit);
	latest.current = commit;
	// The URL changed from outside (back button, clear filters): follow it
	useEffect(() => setDraft(value), [value]);
	useEffect(() => {
		if (draft === value) return;
		const timer = setTimeout(() => latest.current(draft), delay);
		return () => clearTimeout(timer);
	}, [draft, value, delay]);
	return [draft, setDraft, () => draft !== value && latest.current(draft)] as const;
}

const Events: NextPage = () => {
	const { t } = useTranslation('events');
	const { locale } = useRouter();
	const { filters, update, clear, ready, activeCount, hasAny } = useEventFilters();
	const [filtersOpen, setFiltersOpen] = useState(false);

	const input = useMemo(() => buildEventsInput(filters), [filters]);
	const { data, loading, error, refetch } = useQuery(GET_EVENTS, {
		variables: { input },
		skip: !ready,
		fetchPolicy: 'cache-and-network',
		notifyOnNetworkStatusChange: true,
	});
	const { data: venueData } = useQuery(GET_VENUES, {
		variables: { input: { page: 1, limit: 100, search: {} } },
	});
	const cities: string[] = useMemo(
		() =>
			Array.from(
				new Set<string>((venueData?.getVenues?.list ?? []).map((v: { venueCity: string }) => v.venueCity)),
			).sort(),
		[venueData],
	);

	const [q, setQ, commitQ] = useDebouncedCommit(filters.q, (next) => update({ q: next }, 'replace'));
	const [min, setMin, commitMin] = useDebouncedCommit(filters.min, (next) =>
		update({ min: next.replace(/\D/g, '') }, 'replace'),
	);
	const [max, setMax, commitMax] = useDebouncedCommit(filters.max, (next) =>
		update({ max: next.replace(/\D/g, '') }, 'replace'),
	);

	const list: EventItem[] = data?.getEvents?.list ?? [];
	const total: number = data?.getEvents?.metaCounter?.[0]?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const firstLoad = !data && (loading || !ready);

	// A shared link to a page that no longer exists goes to the last page
	useEffect(() => {
		if (data && total > 0 && filters.page > pageCount) update({ page: pageCount }, 'replace');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data, total, pageCount]);

	const from = (filters.page - 1) * PAGE_SIZE + 1;
	const to = Math.min(filters.page * PAGE_SIZE, total);

	return (
		<div className="tz-container browse">
			<Seo
				title={
					filters.category
						? t(`categories.${CATEGORY_SLUGS.find((c) => c.slug === filters.category)!.category}`)
						: t('list.title')
				}
				description={t('list.seoDescription')}
			/>
			<BuyerNoticeBanner />
			<h1 className="browse__title">{t('list.title')}</h1>

			<form
				className="browse__search"
				role="search"
				onSubmit={(event) => {
					event.preventDefault();
					commitQ();
				}}
			>
				<MagnifyingGlass size={20} aria-hidden="true" />
				<input
					type="search"
					className="browse__search-input"
					value={q}
					onChange={(event) => setQ(event.target.value)}
					placeholder={t('list.searchPlaceholder')}
					aria-label={t('list.search')}
					maxLength={100}
				/>
			</form>

			<div className="browse__layout">
				<div className="browse__filters-bar">
					<Button
						variant="outlined"
						startIcon={<FunnelSimple size={18} />}
						aria-expanded={filtersOpen}
						aria-controls="browse-filters"
						onClick={() => setFiltersOpen((open) => !open)}
					>
						{t('filters.title')}
						{activeCount > 0 ? ` (${activeCount})` : ''}
					</Button>
				</div>

				<aside
					id="browse-filters"
					className={`browse__filters${filtersOpen ? ' is-open' : ''}`}
					aria-label={t('filters.title')}
				>
					<div className="browse__group" role="group" aria-labelledby="f-category">
						<h2 id="f-category" className="browse__label">
							{t('filters.category')}
						</h2>
						<ul className="browse__cats">
							<li>
								<button
									type="button"
									className="browse__cat"
									aria-pressed={!filters.category}
									onClick={() => update({ category: '' })}
								>
									<SquaresFour size={18} aria-hidden="true" />
									{t('filters.allEvents')}
									{!filters.category && <Check size={16} className="browse__cat-check" aria-hidden="true" />}
								</button>
							</li>
							{CATEGORY_SLUGS.map((c) => (
								<li key={c.slug}>
									<button
										type="button"
										className="browse__cat"
										aria-pressed={filters.category === c.slug}
										onClick={() => update({ category: c.slug })}
									>
										{categoryIcon(c.category, 18)}
										{t(`categoryPlural.${c.category}`)}
										{filters.category === c.slug && (
											<Check size={16} className="browse__cat-check" aria-hidden="true" />
										)}
									</button>
								</li>
							))}
						</ul>
					</div>

					<div className="browse__group">
						<label className="browse__label" htmlFor="f-from">
							{t('filters.date')}
						</label>
						<div className="browse__pair">
							<label className="browse__sub">
								<span>{t('filters.from')}</span>
								<input
									id="f-from"
									type="date"
									className="tz-input"
									value={filters.from}
									max={filters.to || undefined}
									onChange={(event) => update({ from: event.target.value })}
								/>
							</label>
							<label className="browse__sub">
								<span>{t('filters.to')}</span>
								<input
									type="date"
									className="tz-input"
									value={filters.to}
									min={filters.from || undefined}
									onChange={(event) => update({ to: event.target.value })}
								/>
							</label>
						</div>
					</div>

					<div className="browse__group">
						<label className="browse__label" htmlFor="f-city">
							{t('filters.city')}
						</label>
						<Select
							id="f-city"
							size="small"
							fullWidth
							displayEmpty
							value={cities.includes(filters.city) || !filters.city ? filters.city : ''}
							onChange={(event) => update({ city: event.target.value })}
							inputProps={{ 'aria-label': t('filters.city') }}
						>
							<MenuItem value="">{t('filters.allCities')}</MenuItem>
							{cities.map((city) => (
								<MenuItem key={city} value={city}>
									{city}
								</MenuItem>
							))}
						</Select>
					</div>

					<div className="browse__group">
						<h2 className="browse__label">{t('filters.price')}</h2>
						<div className="browse__pair">
							<label className="browse__sub">
								<span>{t('filters.min')}</span>
								<input
									className="tz-input"
									inputMode="numeric"
									placeholder="0"
									value={min}
									onChange={(event) => setMin(event.target.value.replace(/\D/g, '').slice(0, 9))}
									onBlur={commitMin}
								/>
							</label>
							<label className="browse__sub">
								<span>{t('filters.max')}</span>
								<input
									className="tz-input"
									inputMode="numeric"
									placeholder={t('filters.any')}
									value={max}
									onChange={(event) => setMax(event.target.value.replace(/\D/g, '').slice(0, 9))}
									onBlur={commitMax}
								/>
							</label>
						</div>
					</div>

					{hasAny && (
						<Button variant="text" onClick={clear}>
							{t('filters.clear')}
						</Button>
					)}
				</aside>

				<section className="browse__results" aria-labelledby="browse-count" aria-busy={firstLoad || loading}>
					<h2 className="tz-sr">{t('list.results')}</h2>
					<div className="browse__bar">
						<p id="browse-count" className="browse__count" aria-live="polite">
							{data && total > 0
								? t('list.showing', {
										from: formatNumber(from, locale),
										to: formatNumber(to, locale),
										total: formatNumber(total, locale),
										count: total,
								  })
								: ' '}
						</p>
						<div className="browse__sort">
							<label htmlFor="f-sort" className="browse__label">
								{t('filters.sortBy')}
							</label>
							<Select
								id="f-sort"
								size="small"
								value={filters.sort}
								onChange={(event) => update({ sort: event.target.value as EventSortKey })}
								inputProps={{ 'aria-label': t('filters.sortBy') }}
							>
								{(Object.keys(EVENT_SORTS) as EventSortKey[]).map((key) => (
									<MenuItem key={key} value={key}>
										{t(`sort.${key}`)}
									</MenuItem>
								))}
							</Select>
						</div>
					</div>

					{firstLoad && <EventGridSkeleton count={PAGE_SIZE} />}

					{!data && error && (
						<StateBlock
							alert
							icon={<WarningCircle size={28} />}
							title={t('errors.loadTitle')}
							text={t('errors.loadText')}
							actions={
								<Button variant="outlined" onClick={() => refetch()}>
									{t('errors.retry')}
								</Button>
							}
						/>
					)}

					{data && list.length === 0 && (
						<StateBlock
							icon={<MagnifyingGlass size={28} />}
							title={filters.q ? t('list.noMatchQuery', { query: filters.q }) : t('list.noMatch')}
							text={t('list.noMatchText')}
							actions={
								hasAny ? (
									<Button variant="outlined" onClick={clear}>
										{t('filters.clear')}
									</Button>
								) : undefined
							}
						/>
					)}

					{list.length > 0 && (
						<div className={`tz-grid tz-grid--browse${loading ? ' is-refreshing' : ''}`}>
							{list.map((event, index) => (
								<EventCard key={event._id} event={event} eager={index < 4} />
							))}
						</div>
					)}

					{list.length > 0 && (
						<Pagination
							page={filters.page}
							pageCount={pageCount}
							onChange={(page) => {
								update({ page });
								window.scrollTo({ top: 0, behavior: 'smooth' });
							}}
						/>
					)}
				</section>
			</div>
		</div>
	);
};

export default withLayoutBasic(Events);
