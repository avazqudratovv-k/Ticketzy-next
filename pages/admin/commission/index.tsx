import { useEffect, useMemo, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useApolloClient, useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CheckCircle, MagnifyingGlass, Percent, UsersThree, WarningCircle } from 'phosphor-react';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';
import StateBlock from '../../../libs/components/states/StateBlock';
import Pagination from '../../../libs/components/events/Pagination';
import ReasonDialog from '../../../libs/components/admin/ReasonDialog';
import CommissionDialog from '../../../libs/components/admin/CommissionDialog';
import useListParams from '../../../libs/admin/useListParams';
import { COMMISSION_TIERS, effectiveRate, overrideActive, tierIdOf, tierRate } from '../../../libs/admin/commission';
import { isOrganizerSortKey, ORGANIZER_SORTS, OrganizerSortKey, ORGANIZERS_PAGE_SIZE } from '../../../libs/admin/organizers';
import { isOnlyNoData } from '../../../libs/admin/errors';
import { AdminOrganizer, organizerName } from '../../../libs/admin/types';
import { GET_ADMIN_ORGANIZERS } from '../../../apollo/admin/query';
import { CLEAR_COMMISSION_OVERRIDE_BY_ADMIN } from '../../../apollo/admin/mutation';
import { formatNumber, formatViewerDate } from '../../../libs/format';
import { NETWORK_ERROR, parseApiError } from '../../../libs/errors';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common', 'admin'])),
	},
});

const DEFAULTS = { show: 'approved', q: '', sort: 'newest' };
const isShow = (value: string) => value === 'approved' || value === 'all';

const TIER_CARDS = [
	{ id: 'base', rate: COMMISSION_TIERS[2].rate },
	{ id: 'tier2', rate: COMMISSION_TIERS[1].rate },
	{ id: 'tier3', rate: COMMISSION_TIERS[0].rate },
] as const;

const AdminCommission: NextPage = () => {
	const { t } = useTranslation('admin');
	const { locale } = useRouter();
	const { values, page, update, ready } = useListParams(DEFAULTS, { show: isShow, sort: isOrganizerSortKey });
	const sortKey = values.sort as OrganizerSortKey;
	const [search, setSearch] = useState(values.q);
	const [target, setTarget] = useState<AdminOrganizer | null>(null);
	const [clearTarget, setClearTarget] = useState<AdminOrganizer | null>(null);
	const client = useApolloClient();
	const [notice, setNotice] = useState<string | null>(null);

	useEffect(() => setSearch(values.q), [values.q]);
	useEffect(() => {
		if (search === values.q) return undefined;
		const id = window.setTimeout(() => update({ q: search }, 'replace'), 300);
		return () => window.clearTimeout(id);
	}, [search, values.q, update]);

	const sort = ORGANIZER_SORTS[sortKey];
	const text = values.q.trim();
	const { data, loading, error, refetch } = useQuery(GET_ADMIN_ORGANIZERS, {
		variables: {
			input: {
				page,
				limit: ORGANIZERS_PAGE_SIZE,
				sort: sort.sort,
				direction: sort.direction,
				search: { ...(values.show === 'approved' ? { memberStatus: 'ACTIVE' } : {}), ...(text ? { text } : {}) },
			},
		},
		skip: !ready,
		fetchPolicy: 'cache-and-network',
	});

	const rows: AdminOrganizer[] = useMemo(() => data?.getOrganizersByAdmin?.list ?? [], [data]);
	const total: number = data?.getOrganizersByAdmin?.metaCounter?.[0]?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / ORGANIZERS_PAGE_SIZE));
	const failed = Boolean(error) && !isOnlyNoData(error) && !data?.getOrganizersByAdmin;
	const networkError = error ? parseApiError(error).code === NETWORK_ERROR : false;
	const firstLoad = !ready || (loading && !data && !error);
	const empty = !firstLoad && !failed && rows.length === 0;

	useEffect(() => {
		if (data && page > pageCount) update({ page: pageCount }, 'replace');
	}, [data, page, pageCount, update]);

	return (
		<div className="org-page">
			<Head>
				<title>{`${t('commission.title')} · Ticketzy`}</title>
			</Head>
			<div className="tz-pagehead org-pagehead">
				<div>
					<h1>{t('commission.title')}</h1>
					<p>{t('commission.subtitle')}</p>
				</div>
			</div>

			<section aria-labelledby="tiers-title" className="adm-card">
				<h2 id="tiers-title" className="adm-card__title">
					<Percent size={20} aria-hidden="true" /> {t('commission.tiers.title')}
				</h2>
				<ul className="adm-tiers">
					{TIER_CARDS.map((tier) => (
						<li key={tier.id} className="adm-tier">
							<span className="adm-tier__rate">{t('percent', { value: formatNumber(tier.rate, locale) })}</span>
							<strong>{t(`commission.tiers.${tier.id}.name`)}</strong>
							<span className="adm-muted">{t(`commission.tiers.${tier.id}.when`)}</span>
						</li>
					))}
				</ul>
				<p className="adm-muted">{t('commission.tiers.note')}</p>
			</section>

			{notice && (
				<p className="tz-alert tz-alert--success" role="status">
					<CheckCircle size={20} aria-hidden="true" />
					<span>{notice}</span>
				</p>
			)}

			<div className="org-toolbar">
				<label className="org-search">
					<MagnifyingGlass size={20} aria-hidden="true" />
					<span className="org-visually-hidden">{t('organizers.search')}</span>
					<input type="search" className="tz-input" value={search} placeholder={t('organizers.searchPlaceholder')} maxLength={100} onChange={(event) => setSearch(event.target.value)} />
				</label>
				<label className="org-select">
					<span className="org-visually-hidden">{t('commission.show')}</span>
					<select className="tz-input" value={values.show} onChange={(event) => update({ show: event.target.value })}>
						<option value="approved">{t('commission.showApproved')}</option>
						<option value="all">{t('commission.showAll')}</option>
					</select>
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
					{[0, 1, 2].map((n) => (
						<li key={n} className="org-row">
							<span className="tz-skel tz-skel--block" />
						</li>
					))}
				</ul>
			) : empty ? (
				<StateBlock
					icon={text ? <MagnifyingGlass size={28} /> : <UsersThree size={28} />}
					title={text ? t('organizers.none.title') : t('commission.empty.title')}
					text={text ? t('organizers.none.text') : t('commission.empty.text')}
					actions={
						text ? (
							<Button variant="outlined" onClick={() => update({ q: '', show: 'all' })}>
								{t('organizers.none.clear')}
							</Button>
						) : undefined
					}
				/>
			) : (
				<>
					<div className="org-table adm-table adm-table--commission" role="table" aria-label={t('commission.title')}>
						<div className="org-row org-row--head" role="row">
							<span role="columnheader">{t('commission.cols.organizer')}</span>
							<span role="columnheader" className="org-num">
								{t('commission.cols.completed')}
							</span>
							<span role="columnheader">{t('commission.cols.override')}</span>
							<span role="columnheader" className="org-num">
								{t('commission.cols.effective')}
							</span>
							<span role="columnheader">{t('commission.cols.actions')}</span>
						</div>
						{rows.map((organizer) => {
							const eff = effectiveRate(organizer);
							const override = organizer.commissionOverride;
							const active = overrideActive(override);
							return (
								<div className="org-row" role="row" key={organizer._id}>
									<div role="cell" className="org-row__event">
										<span className="org-row__title">{organizerName(organizer)}</span>
										<span className="org-row__meta">{organizer.memberEmail || '–'}</span>
										{organizer.memberStatus !== 'ACTIVE' && <span className="org-row__meta">{t(`memberStatus.${organizer.memberStatus}`)}</span>}
									</div>
									<div role="cell" className="org-num">
										<span className="org-row__label">{t('commission.cols.completed')}</span>
										{formatNumber(organizer.completedEvents, locale)}
										<span className="org-row__meta adm-block">
											{t(`commission.tiers.${tierIdOf(organizer.completedEvents)}.name`)} · {t('percent', { value: formatNumber(tierRate(organizer.completedEvents), locale) })}
										</span>
									</div>
									<div role="cell" className="adm-override">
										<span className="org-row__label">{t('commission.cols.override')}</span>
										{override ? (
											<>
												<strong>{t('percent', { value: formatNumber(override.rate, locale) })}</strong>
												<span className="org-row__meta">
													{active
														? override.endsAt
															? t('commission.until', { date: formatViewerDate(override.endsAt, locale) })
															: t('commission.noEnd')
														: t('commission.expired', { date: formatViewerDate(override.endsAt as string, locale) })}
												</span>
												<span className="org-row__meta">{override.reason}</span>
											</>
										) : (
											<span className="adm-muted">{t('commission.noOverride')}</span>
										)}
									</div>
									<div role="cell" className="org-num">
										<span className="org-row__label">{t('commission.cols.effective')}</span>
										<strong className="adm-rate">{t('percent', { value: formatNumber(eff.rate, locale) })}</strong>
										<span className="org-row__meta adm-block">{t(`commission.source.${eff.source}`)}</span>
									</div>
									<div role="cell" className="org-row__actions">
										{organizer.memberStatus !== 'DELETE' ? (
											<button
												type="button"
												className="tz-link org-linkbtn"
												onClick={() => {
													setNotice(null);
													setTarget(organizer);
												}}
											>
												{override && active ? t('commission.actions.change') : t('commission.actions.set')}
											</button>
										) : null}
										{override && organizer.memberStatus !== 'DELETE' ? (
											<button
												type="button"
												className="tz-link org-linkbtn"
												onClick={() => {
													setNotice(null);
													setClearTarget(organizer);
												}}
											>
												{t('commission.actions.clear')}
											</button>
										) : null}
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

			<ReasonDialog
				open={Boolean(clearTarget)}
				title={t('commission.clear.title')}
				subject={organizerName(clearTarget)}
				reasonLabel={t('commission.clear.reasonLabel')}
				reasonHint={t('commission.clear.reasonHint')}
				reasonRequired={t('commission.clear.reasonRequired')}
				confirmLabel={t('commission.clear.confirm')}
				sendingLabel={t('commission.clear.sending')}
				cancelLabel={t('actions.back')}
				onClose={() => setClearTarget(null)}
				onSubmit={async (reason) => {
					if (!clearTarget) return;
					const result = await client.mutate({
						mutation: CLEAR_COMMISSION_OVERRIDE_BY_ADMIN,
						variables: { input: { memberId: clearTarget._id, reason } },
					});
					const cleared = result.data.clearCommissionOverrideByAdmin;
					setClearTarget(null);
					setNotice(
						t('commission.notice.cleared', {
							name: organizerName(cleared.member),
							previous: formatNumber(cleared.previousOverride.rate, locale),
							rate: formatNumber(cleared.automaticRate, locale),
						}),
					);
					await refetch();
				}}
			>
				{clearTarget?.commissionOverride && (
					<>
						<dl className="org-dl adm-dl">
							<div>
								<dt>{t('commission.clear.previous')}</dt>
								<dd>
									{t('percent', { value: formatNumber(clearTarget.commissionOverride.rate, locale) })} ·{' '}
									{clearTarget.commissionOverride.endsAt
										? overrideActive(clearTarget.commissionOverride)
											? t('commission.until', { date: formatViewerDate(clearTarget.commissionOverride.endsAt, locale) })
											: t('commission.expired', { date: formatViewerDate(clearTarget.commissionOverride.endsAt, locale) })
										: t('commission.noEnd')}
									<span className="org-row__meta adm-block">{clearTarget.commissionOverride.reason}</span>
								</dd>
							</div>
							<div>
								<dt>{t('commission.clear.falls')}</dt>
								<dd>
									{t('percent', { value: formatNumber(tierRate(clearTarget.completedEvents), locale) })} ·{' '}
									{t(`commission.tiers.${tierIdOf(clearTarget.completedEvents)}.name`)}
								</dd>
							</div>
						</dl>
						<p className="adm-muted">{t('commission.clear.text')}</p>
					</>
				)}
			</ReasonDialog>

			<CommissionDialog
				organizer={target}
				onClose={() => setTarget(null)}
				onSaved={async (organizer) => {
					setTarget(null);
					setNotice(t('commission.notice.saved', { name: organizerName(organizer), rate: formatNumber(organizer.commissionOverride?.rate ?? 0, locale) }));
					await refetch();
				}}
			/>
		</div>
	);
};

export default withAdminLayout(AdminCommission);
