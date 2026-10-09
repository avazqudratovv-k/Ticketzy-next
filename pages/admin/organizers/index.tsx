import { useEffect, useMemo, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CheckCircle, MagnifyingGlass, UsersThree, WarningCircle } from 'phosphor-react';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';
import StateBlock from '../../../libs/components/states/StateBlock';
import Pagination from '../../../libs/components/events/Pagination';
import MemberStatusBadge from '../../../libs/components/admin/MemberStatusBadge';
import OrganizerDrawer from '../../../libs/components/admin/OrganizerDrawer';
import MessageOrganizer from '../../../libs/components/admin/MessageOrganizer';
import useListParams from '../../../libs/admin/useListParams';
import {
	isOrganizerSortKey,
	isOrganizerTab,
	ORGANIZER_SORTS,
	ORGANIZER_TABS,
	OrganizerSortKey,
	organizerCountKey,
	OrganizerTab,
	organizerTabStatus,
	ORGANIZERS_PAGE_SIZE,
} from '../../../libs/admin/organizers';
import { effectiveRate } from '../../../libs/admin/commission';
import { isOnlyNoData } from '../../../libs/admin/errors';
import { AdminOrganizer, organizerName } from '../../../libs/admin/types';
import { GET_ADMIN_ORGANIZER_COUNTS, GET_ADMIN_ORGANIZERS } from '../../../apollo/admin/query';
import { formatNumber, formatViewerDate } from '../../../libs/format';
import { NETWORK_ERROR, parseApiError } from '../../../libs/errors';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common', 'admin', 'events'])),
	},
});

const DEFAULTS = { tab: 'pending', q: '', sort: 'newest' };

const AdminOrganizers: NextPage = () => {
	const { t } = useTranslation('admin');
	const { locale } = useRouter();
	const { values, page, update, ready } = useListParams(DEFAULTS, { tab: isOrganizerTab, sort: isOrganizerSortKey });
	const tab = values.tab as OrganizerTab;
	const sortKey = values.sort as OrganizerSortKey;
	const [search, setSearch] = useState(values.q);
	const [selected, setSelected] = useState<AdminOrganizer | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	useEffect(() => setSearch(values.q), [values.q]);
	useEffect(() => {
		if (search === values.q) return undefined;
		const id = window.setTimeout(() => update({ q: search }, 'replace'), 300);
		return () => window.clearTimeout(id);
	}, [search, values.q, update]);

	const { data: countData, refetch: refetchCounts } = useQuery(GET_ADMIN_ORGANIZER_COUNTS, { skip: !ready, errorPolicy: 'all', fetchPolicy: 'cache-and-network' });
	const status = organizerTabStatus(tab);
	const sort = ORGANIZER_SORTS[sortKey];
	const text = values.q.trim();
	const { data, loading, error, refetch } = useQuery(GET_ADMIN_ORGANIZERS, {
		variables: {
			input: {
				page,
				limit: ORGANIZERS_PAGE_SIZE,
				sort: sort.sort,
				direction: sort.direction,
				search: { ...(status ? { memberStatus: status } : {}), ...(text ? { text } : {}) },
			},
		},
		skip: !ready,
		fetchPolicy: 'cache-and-network',
	});

	const rows: AdminOrganizer[] = useMemo(() => data?.getOrganizersByAdmin?.list ?? [], [data]);
	const total: number = data?.getOrganizersByAdmin?.metaCounter?.[0]?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / ORGANIZERS_PAGE_SIZE));
	const count = (key: OrganizerTab) => countData?.[organizerCountKey(key)]?.metaCounter?.[0]?.total ?? 0;

	const failed = Boolean(error) && !isOnlyNoData(error) && !data?.getOrganizersByAdmin;
	const networkError = error ? parseApiError(error).code === NETWORK_ERROR : false;
	const firstLoad = !ready || (loading && !data && !error);
	const empty = !firstLoad && !failed && rows.length === 0;
	const filtered = Boolean(text) || tab !== 'all';

	useEffect(() => {
		if (data && page > pageCount) update({ page: pageCount }, 'replace');
	}, [data, page, pageCount, update]);

	const changed = async (organizer: AdminOrganizer, message: string) => {
		setSelected(organizer);
		setNotice(message);
		await Promise.all([refetch(), refetchCounts()]);
	};

	return (
		<div className="org-page">
			<Head>
				<title>{`${t('organizers.title')} · Ticketzy`}</title>
			</Head>
			<div className="tz-pagehead org-pagehead">
				<div>
					<h1>{t('organizers.title')}</h1>
					<p>{t('organizers.subtitle')}</p>
				</div>
			</div>

			{notice && (
				<p className="tz-alert tz-alert--success" role="status">
					<CheckCircle size={20} aria-hidden="true" />
					<span>{notice}</span>
				</p>
			)}

			<div className="org-tabs" role="tablist" aria-label={t('organizers.tabsLabel')}>
				{ORGANIZER_TABS.map((key) => (
					<button key={key} type="button" role="tab" aria-selected={tab === key} className="org-tab" onClick={() => update({ tab: key })}>
						{t(`organizers.tabs.${key}`)}
						<span className="org-tab__count">{formatNumber(count(key), locale)}</span>
					</button>
				))}
			</div>

			<div className="org-toolbar">
				<label className="org-search">
					<MagnifyingGlass size={20} aria-hidden="true" />
					<span className="org-visually-hidden">{t('organizers.search')}</span>
					<input type="search" className="tz-input" value={search} placeholder={t('organizers.searchPlaceholder')} maxLength={100} onChange={(event) => setSearch(event.target.value)} />
				</label>
				<label className="org-select">
					<span className="org-visually-hidden">{t('organizers.sort')}</span>
					<select className="tz-input" value={sortKey} onChange={(event) => update({ sort: event.target.value })}>
						{(Object.keys(ORGANIZER_SORTS) as OrganizerSortKey[]).map((key) => (
							<option key={key} value={key}>
								{t(`organizers.sorts.${key}`)}
							</option>
						))}
					</select>
				</label>
			</div>

			{failed ? (
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('organizers.error.title')}
					text={networkError ? t('errors.network') : t('organizers.error.text')}
					actions={
						<Button variant="outlined" onClick={() => refetch()}>
							{t('errors.retry')}
						</Button>
					}
				/>
			) : firstLoad ? (
				<ul className="org-rows" aria-busy="true" aria-label={t('organizers.loading')}>
					{[0, 1, 2, 3].map((n) => (
						<li key={n} className="org-row">
							<span className="tz-skel tz-skel--block" />
						</li>
					))}
				</ul>
			) : empty ? (
				<StateBlock
					icon={filtered && text ? <MagnifyingGlass size={28} /> : <UsersThree size={28} />}
					title={text ? t('organizers.none.title') : tab === 'pending' ? t('organizers.empty.pendingTitle') : t('organizers.empty.title')}
					text={text ? t('organizers.none.text') : tab === 'pending' ? t('organizers.empty.pendingText') : t('organizers.empty.text')}
					actions={
						filtered ? (
							<Button variant="outlined" onClick={() => update({ tab: 'all', q: '' })}>
								{t('organizers.none.clear')}
							</Button>
						) : undefined
					}
				/>
			) : (
				<>
					<div className="org-table adm-table adm-table--organizers" role="table" aria-label={t('organizers.title')}>
						<div className="org-row org-row--head" role="row">
							<span role="columnheader">{t('organizers.cols.organizer')}</span>
							<span role="columnheader">{t('organizers.cols.status')}</span>
							<span role="columnheader" className="org-num">
								{t('organizers.cols.events')}
							</span>
							<span role="columnheader" className="org-num">
								{t('organizers.cols.rate')}
							</span>
							<span role="columnheader">{t('organizers.cols.actions')}</span>
						</div>
						{rows.map((organizer) => {
							const rate = effectiveRate(organizer);
							return (
								<div className="org-row" role="row" key={organizer._id}>
									<div role="cell" className="org-row__event">
										<button type="button" className="org-row__title adm-rowbtn" onClick={() => { setNotice(null); setSelected(organizer); }}>
											{organizerName(organizer)}
										</button>
										<span className="org-row__meta">{organizer.memberEmail || '–'}</span>
										<span className="org-row__meta">{t('organizers.registered', { date: formatViewerDate(organizer.createdAt, locale) })}</span>
									</div>
									<div role="cell" className="org-row__status">
										<MemberStatusBadge status={organizer.memberStatus} />
										{organizer.memberStatus === 'REJECTED' && organizer.rejectReason && <span className="org-row__reason">{organizer.rejectReason}</span>}
									</div>
									<div role="cell" className="org-num">
										<span className="org-row__label">{t('organizers.cols.events')}</span>
										{t('organizers.eventsCount', { completed: formatNumber(organizer.completedEvents, locale), total: formatNumber(organizer.memberEvents, locale) })}
									</div>
									<div role="cell" className="org-num">
										<span className="org-row__label">{t('organizers.cols.rate')}</span>
										{t('percent', { value: formatNumber(rate.rate, locale) })}
									</div>
									<div role="cell" className="org-row__actions">
										<button type="button" className="tz-link org-linkbtn" onClick={() => { setNotice(null); setSelected(organizer); }}>
											{organizer.memberStatus === 'PENDING' ? t('organizers.actions.review') : t('organizers.actions.open')}
										</button>
										<MessageOrganizer organizerId={organizer._id} variant="link" />
									</div>
								</div>
							);
						})}
					</div>
					<div className="org-foot">
						<p>
							{t('organizers.showing', {
								from: formatNumber((page - 1) * ORGANIZERS_PAGE_SIZE + 1, locale),
								to: formatNumber((page - 1) * ORGANIZERS_PAGE_SIZE + rows.length, locale),
								total: formatNumber(total, locale),
							})}
						</p>
						<Pagination page={Math.min(page, pageCount)} pageCount={pageCount} onChange={(next) => update({ page: next })} />
					</div>
				</>
			)}

			<OrganizerDrawer organizer={selected} onClose={() => setSelected(null)} onChanged={changed} />
		</div>
	);
};

export default withAdminLayout(AdminOrganizers);
