import { useEffect, useMemo, useState } from 'react';
import { NextPage, GetStaticPropsContext } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ApolloError, useApolloClient } from '@apollo/client';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Drawer, IconButton } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ArrowCounterClockwise, CheckCircle, MagnifyingGlass, Prohibit, ShieldCheck, UsersThree, WarningCircle, X } from 'phosphor-react';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';
import StateBlock from '../../../libs/components/states/StateBlock';
import Pagination from '../../../libs/components/events/Pagination';
import MemberStatusBadge from '../../../libs/components/admin/MemberStatusBadge';
import { imageSrc } from '../../../libs/components/events/EventImage';
import useAuth from '../../../libs/hooks/useAuth';
import useListParams from '../../../libs/admin/useListParams';
import {
	isMemberSortKey,
	isMemberStatusFilter,
	isMemberTypeFilter,
	MEMBER_SORTS,
	MEMBER_STATUS_FILTERS,
	MEMBER_TYPE_FILTERS,
	MemberAction,
	memberActionFor,
	MemberSortKey,
	MemberStatusFilter,
	memberStatusOf,
	MemberTypeFilter,
	memberTypeOf,
	MEMBERS_PAGE_SIZE,
} from '../../../libs/admin/members';
import { AdminError, describeAdminError, isOnlyNoData } from '../../../libs/admin/errors';
import { AdminMember, organizerName } from '../../../libs/admin/types';
import { MemberStatus } from '../../../libs/enums/member.enum';
import { GET_ALL_MEMBERS_BY_ADMIN, UPDATE_MEMBER_BY_ADMIN } from '../../../apollo/admin/mutation';
import { formatNumber, formatViewerDate } from '../../../libs/format';
import { NETWORK_ERROR, parseApiError } from '../../../libs/errors';

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: {
		...(await serverSideTranslations(locale ?? 'en', ['common', 'admin', 'events'])),
	},
});

const DEFAULTS = { type: 'all', status: 'all', q: '', sort: 'newest' };

const AdminMembers: NextPage = () => {
	const { t } = useTranslation('admin');
	const { locale } = useRouter();
	const client = useApolloClient();
	const { user } = useAuth();
	const { values, page, update, ready } = useListParams(DEFAULTS, { type: isMemberTypeFilter, status: isMemberStatusFilter, sort: isMemberSortKey });
	const typeFilter = values.type as MemberTypeFilter;
	const statusFilter = values.status as MemberStatusFilter;
	const sortKey = values.sort as MemberSortKey;
	const [search, setSearch] = useState(values.q);
	const [selected, setSelected] = useState<AdminMember | null>(null);
	const [confirm, setConfirm] = useState<MemberAction | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<AdminError | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	useEffect(() => setSearch(values.q), [values.q]);
	useEffect(() => {
		if (search === values.q) return undefined;
		const id = window.setTimeout(() => update({ q: search }, 'replace'), 300);
		return () => window.clearTimeout(id);
	}, [search, values.q, update]);

	const sort = MEMBER_SORTS[sortKey];
	const text = values.q.trim();
	const memberType = memberTypeOf(typeFilter);
	const memberStatus = memberStatusOf(statusFilter);
	// getAllMembersByAdmin is a mutation in the schema, so the list is loaded with client.mutate
	const [list, setList] = useState<{ list: AdminMember[]; total: number } | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<ApolloError | null>(null);
	const [reloads, setReloads] = useState(0);
	const input = {
		page,
		limit: MEMBERS_PAGE_SIZE,
		sort: sort.sort,
		direction: sort.direction,
		search: { ...(memberType ? { memberType } : {}), ...(memberStatus ? { memberStatus } : {}), ...(text ? { text } : {}) },
	};
	const inputKey = JSON.stringify(input);

	useEffect(() => {
		if (!ready) return undefined;
		let cancelled = false;
		setLoading(true);
		client
			.mutate({ mutation: GET_ALL_MEMBERS_BY_ADMIN, variables: { input: JSON.parse(inputKey) }, fetchPolicy: 'no-cache' })
			.then((result) => {
				if (cancelled) return;
				const block = result.data?.getAllMembersByAdmin;
				setList({ list: block?.list ?? [], total: block?.metaCounter?.[0]?.total ?? 0 });
				setLoadError(null);
			})
			.catch((err) => {
				if (!cancelled) setLoadError(err as ApolloError);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [client, ready, inputKey, reloads]);
	const refetch = async () => setReloads((n) => n + 1);
	const data = list;

	const rows: AdminMember[] = useMemo(() => data?.list ?? [], [data]);
	const total: number = data?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / MEMBERS_PAGE_SIZE));
	const failed = Boolean(loadError) && !isOnlyNoData(loadError ?? undefined) && !data;
	const networkError = loadError ? parseApiError(loadError).code === NETWORK_ERROR : false;
	const firstLoad = !ready || (loading && !data && !loadError);
	const empty = !firstLoad && !failed && rows.length === 0;
	const filtered = Boolean(text) || typeFilter !== 'all' || statusFilter !== 'all';

	useEffect(() => {
		if (data && page > pageCount) update({ page: pageCount }, 'replace');
	}, [data, page, pageCount, update]);

	const guard = selected ? memberActionFor(selected, user?._id) : null;
	const name = selected ? organizerName(selected) || selected.memberEmail || selected._id : '';

	const apply = async () => {
		if (!selected || !confirm) return;
		setBusy(true);
		setError(null);
		try {
			// Only the status is sent; the role and every other field are never touched from here
			const result = await client.mutate({
				mutation: UPDATE_MEMBER_BY_ADMIN,
				variables: { input: { _id: selected._id, memberStatus: confirm === 'suspend' ? MemberStatus.SUSPENDED : MemberStatus.ACTIVE } },
			});
			const updated = result.data?.updateMemberByAdmin as Pick<AdminMember, 'memberStatus' | 'memberType'>;
			setSelected({ ...selected, memberStatus: updated.memberStatus });
			setNotice(t(confirm === 'suspend' ? 'members.notice.suspended' : 'members.notice.reactivated', { name }));
			setConfirm(null);
			await refetch();
		} catch (err) {
			setError(describeAdminError(err));
		} finally {
			setBusy(false);
		}
	};

	const open = (member: AdminMember) => {
		setNotice(null);
		setError(null);
		setSelected(member);
	};

	return (
		<div className="org-page">
			<Head>
				<title>{`${t('members.title')} · Ticketzy`}</title>
			</Head>
			<div className="tz-pagehead org-pagehead">
				<div>
					<h1>{t('members.title')}</h1>
					<p>{t('members.subtitle')}</p>
				</div>
			</div>

			{notice && (
				<p className="tz-alert tz-alert--success" role="status">
					<CheckCircle size={20} aria-hidden="true" />
					<span>{notice}</span>
				</p>
			)}

			<div className="org-toolbar">
				<label className="org-search">
					<MagnifyingGlass size={20} aria-hidden="true" />
					<span className="org-visually-hidden">{t('members.search')}</span>
					<input type="search" className="tz-input" value={search} placeholder={t('members.searchPlaceholder')} maxLength={100} onChange={(event) => setSearch(event.target.value)} />
				</label>
				<label className="org-select">
					<span className="org-visually-hidden">{t('members.filterType')}</span>
					<select className="tz-input" value={typeFilter} onChange={(event) => update({ type: event.target.value })}>
						{MEMBER_TYPE_FILTERS.map((key) => (
							<option key={key} value={key}>
								{t(`members.types.${key}`)}
							</option>
						))}
					</select>
				</label>
				<label className="org-select">
					<span className="org-visually-hidden">{t('members.filterStatus')}</span>
					<select className="tz-input" value={statusFilter} onChange={(event) => update({ status: event.target.value })}>
						{MEMBER_STATUS_FILTERS.map((key) => (
							<option key={key} value={key}>
								{t(`members.statuses.${key}`)}
							</option>
						))}
					</select>
				</label>
				<label className="org-select">
					<span className="org-visually-hidden">{t('members.sort')}</span>
					<select className="tz-input" value={sortKey} onChange={(event) => update({ sort: event.target.value })}>
						{(Object.keys(MEMBER_SORTS) as MemberSortKey[]).map((key) => (
							<option key={key} value={key}>
								{t(`members.sorts.${key}`)}
							</option>
						))}
					</select>
				</label>
			</div>

			{failed ? (
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('members.error.title')}
					text={networkError ? t('errors.network') : t('members.error.text')}
					actions={
						<Button variant="outlined" onClick={() => refetch()}>
							{t('errors.retry')}
						</Button>
					}
				/>
			) : firstLoad ? (
				<ul className="org-rows" aria-busy="true" aria-label={t('members.loading')}>
					{[0, 1, 2, 3].map((n) => (
						<li key={n} className="org-row">
							<span className="tz-skel tz-skel--block" />
						</li>
					))}
				</ul>
			) : empty ? (
				<StateBlock
					icon={filtered ? <MagnifyingGlass size={28} /> : <UsersThree size={28} />}
					title={filtered ? t('members.none.title') : t('members.empty.title')}
					text={filtered ? t('members.none.text') : t('members.empty.text')}
					actions={
						filtered ? (
							<Button variant="outlined" onClick={() => update({ type: 'all', status: 'all', q: '' })}>
								{t('members.none.clear')}
							</Button>
						) : undefined
					}
				/>
			) : (
				<>
					<div className="org-table adm-table adm-table--members" role="table" aria-label={t('members.title')}>
						<div className="org-row org-row--head" role="row">
							<span role="columnheader">{t('members.cols.member')}</span>
							<span role="columnheader">{t('members.cols.type')}</span>
							<span role="columnheader">{t('members.cols.status')}</span>
							<span role="columnheader">{t('members.cols.joined')}</span>
							<span role="columnheader">{t('members.cols.actions')}</span>
						</div>
						{rows.map((member) => (
							<div className="org-row" role="row" key={member._id}>
								<div role="cell" className="org-row__event">
									<button type="button" className="org-row__title adm-rowbtn" onClick={() => open(member)}>
										{organizerName(member) || member._id}
									</button>
									<span className="org-row__meta">{member.memberEmail || '–'}</span>
									{user?._id === member._id && <span className="org-row__meta">{t('members.you')}</span>}
								</div>
								<div role="cell">
									<span className="org-row__label">{t('members.cols.type')}</span>
									{t(`members.types.${member.memberType}`)}
								</div>
								<div role="cell" className="org-row__status">
									<MemberStatusBadge status={member.memberStatus} />
								</div>
								<div role="cell">
									<span className="org-row__label">{t('members.cols.joined')}</span>
									{formatViewerDate(member.createdAt, locale)}
								</div>
								<div role="cell" className="org-row__actions">
									<button type="button" className="tz-link org-linkbtn" onClick={() => open(member)}>
										{t('members.actions.open')}
									</button>
								</div>
							</div>
						))}
					</div>
					<div className="org-foot">
						<p>
							{t('members.showing', {
								from: formatNumber((page - 1) * MEMBERS_PAGE_SIZE + 1, locale),
								to: formatNumber((page - 1) * MEMBERS_PAGE_SIZE + rows.length, locale),
								total: formatNumber(total, locale),
							})}
						</p>
						<Pagination page={Math.min(page, pageCount)} pageCount={pageCount} onChange={(next) => update({ page: next })} />
					</div>
				</>
			)}

			<Drawer anchor="right" open={Boolean(selected)} onClose={() => setSelected(null)} PaperProps={{ className: 'org-drawer', role: 'dialog', 'aria-labelledby': 'member-drawer-title' } as object}>
				{selected && guard && (
					<>
						<div className="org-drawer__head">
							<div>
								<h2 id="member-drawer-title">{name}</h2>
								<MemberStatusBadge status={selected.memberStatus} />
							</div>
							<IconButton onClick={() => setSelected(null)} aria-label={t('members.drawer.close')}>
								<X size={22} aria-hidden="true" />
							</IconButton>
						</div>
						<div className="org-drawer__body">
							{selected.memberImage && (
								// eslint-disable-next-line @next/next/no-img-element
								<img className="adm-avatar" src={imageSrc(selected.memberImage)} alt="" />
							)}
							<dl className="org-dl">
								<div>
									<dt>{t('members.drawer.type')}</dt>
									<dd>{t(`members.types.${selected.memberType}`)}</dd>
								</div>
								<div>
									<dt>{t('members.drawer.email')}</dt>
									<dd>{selected.memberEmail || '–'}</dd>
								</div>
								<div>
									<dt>{t('members.drawer.phone')}</dt>
									<dd>{selected.memberPhone || '–'}</dd>
								</div>
								<div>
									<dt>{t('members.drawer.nick')}</dt>
									<dd>{selected.memberNick || '–'}</dd>
								</div>
								<div>
									<dt>{t('members.drawer.joined')}</dt>
									<dd>{formatViewerDate(selected.createdAt, locale, true)}</dd>
								</div>
								<div>
									<dt>{t('members.drawer.updated')}</dt>
									<dd>{formatViewerDate(selected.updatedAt, locale, true)}</dd>
								</div>
								{selected.memberType === 'ORGANIZER' && (
									<div>
										<dt>{t('members.drawer.events')}</dt>
										<dd>{t('organizers.eventsCount', { completed: formatNumber(selected.completedEvents, locale), total: formatNumber(selected.memberEvents, locale) })}</dd>
									</div>
								)}
							</dl>
							{guard.locked && (
								<p className="tz-alert tz-alert--info" role="note">
									<ShieldCheck size={20} aria-hidden="true" />
									<span>{t(`members.locked.${guard.locked}`)}</span>
								</p>
							)}
							{error && (
								<p className="tz-alert tz-alert--error" role="alert">
									<WarningCircle size={20} aria-hidden="true" />
									<span>{error.network ? t('errors.network') : error.key ? t(`serverErrors.${error.key}`) : error.raw || t('errors.generic')}</span>
								</p>
							)}
							<div className="adm-actions">
								{guard.action === 'suspend' && (
									<Button variant="outlined" className="org-btn-danger" startIcon={<Prohibit size={20} aria-hidden="true" />} onClick={() => { setError(null); setConfirm('suspend'); }}>
										{t('members.actions.suspend')}
									</Button>
								)}
								{guard.action === 'reactivate' && (
									<Button variant="contained" startIcon={<ArrowCounterClockwise size={20} aria-hidden="true" />} onClick={() => { setError(null); setConfirm('reactivate'); }}>
										{t('members.actions.reactivate')}
									</Button>
								)}
								{guard.locked === 'organizer' && (
									<Button component={Link} href={`/admin/organizers?tab=all&q=${encodeURIComponent(selected.memberNick || selected.memberEmail || '')}`} variant="outlined">
										{t('members.actions.openOrganizer')}
									</Button>
								)}
							</div>
						</div>
					</>
				)}
			</Drawer>

			<Dialog open={Boolean(confirm)} onClose={() => !busy && setConfirm(null)} aria-labelledby="member-confirm-title" fullWidth maxWidth="xs">
				<DialogTitle id="member-confirm-title">{confirm ? t(`members.confirm.${confirm}.title`) : ''}</DialogTitle>
				<DialogContent>
					<p className="org-dialog__event">{name}</p>
					<p>{confirm ? t(`members.confirm.${confirm}.text`) : ''}</p>
					{error && (
						<p className="tz-alert tz-alert--error" role="alert">
							<WarningCircle size={20} aria-hidden="true" />
							<span>{error.network ? t('errors.network') : error.key ? t(`serverErrors.${error.key}`) : error.raw || t('errors.generic')}</span>
						</p>
					)}
				</DialogContent>
				<DialogActions className="org-dialog__actions">
					<Button variant="text" onClick={() => setConfirm(null)} disabled={busy}>
						{t('actions.back')}
					</Button>
					<Button variant="contained" className={confirm === 'suspend' ? 'org-btn-danger-solid' : undefined} onClick={apply} disabled={busy}>
						{busy ? t('members.sending') : confirm ? t(`members.confirm.${confirm}.confirm`) : ''}
					</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
};

export default withAdminLayout(AdminMembers);
