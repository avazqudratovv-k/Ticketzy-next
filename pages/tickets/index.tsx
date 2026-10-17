import { useEffect } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { DownloadSimple, Ticket } from 'phosphor-react';
import { GET_MY_TICKETS_LIST } from '../../apollo/user/query';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import { withAccount } from '../../libs/components/account/AccountShell';
import PageHead from '../../libs/components/account/PageHead';
import LoadError from '../../libs/components/account/LoadError';
import TicketCard, { TicketCardSkeleton } from '../../libs/components/account/TicketCard';
import Seo from '../../libs/components/common/Seo';
import StateBlock from '../../libs/components/states/StateBlock';
import Pagination from '../../libs/components/events/Pagination';
import useUrlState from '../../libs/hooks/useUrlState';
import useTicketDownload from '../../libs/hooks/useTicketDownload';
import { formatNumber } from '../../libs/format';
import { ROUTES } from '../../libs/routes';
import { AccountTicket } from '../../libs/types/account';

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'events', 'checkout', 'account'])) },
});

const PAGE_SIZE = 12;
type Tab = 'UPCOMING' | 'PAST';

const Tickets: NextPage = () => {
	const { t } = useTranslation('account');
	const { locale } = useRouter();
	const { page, value, ready, update } = useUrlState('tab');
	const download = useTicketDownload();
	const tab: Tab = value === 'past' ? 'PAST' : 'UPCOMING';
	const other: Tab = tab === 'PAST' ? 'UPCOMING' : 'PAST';

	const { data, loading, error, refetch } = useQuery(GET_MY_TICKETS_LIST, {
		variables: { input: { page, limit: PAGE_SIZE, timeFilter: tab } },
		skip: !ready,
		fetchPolicy: 'cache-and-network',
	});
	// The other tab only needs its count
	const { data: otherData } = useQuery(GET_MY_TICKETS_LIST, {
		variables: { input: { page: 1, limit: 1, timeFilter: other } },
		skip: !ready,
		fetchPolicy: 'cache-and-network',
		errorPolicy: 'ignore',
	});
	const list: AccountTicket[] = data?.getMyTickets?.list ?? [];
	const total: number = data?.getMyTickets?.metaCounter?.[0]?.total ?? 0;
	const otherTotal: number = otherData?.getMyTickets?.metaCounter?.[0]?.total ?? 0;
	const counts = { UPCOMING: tab === 'UPCOMING' ? total : otherTotal, PAST: tab === 'PAST' ? total : otherTotal };
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const firstLoad = !data && (loading || !ready);

	useEffect(() => {
		if (data && page > pageCount) update({ page: pageCount });
	}, [data, page, pageCount, update]);

	return (
		<>
			<Seo title={t('tickets.title')} noindex />
			<PageHead title={t('tickets.title')} text={t('tickets.sub')} />
			<div className="acct__tabs" role="tablist" aria-label={t('tickets.tabs')}>
				{(['UPCOMING', 'PAST'] as Tab[]).map((id) => (
					<button
						key={id}
						type="button"
						role="tab"
						id={`tickets-tab-${id}`}
						aria-selected={tab === id}
						aria-controls="tickets-panel"
						className="acct__tab"
						onClick={() => update({ value: id === 'PAST' ? 'past' : '' })}
					>
						{t(id === 'PAST' ? 'tickets.past' : 'tickets.upcoming')}
						<span className="acct__tabcount">{formatNumber(counts[id], locale)}</span>
					</button>
				))}
			</div>
			<div id="tickets-panel" role="tabpanel" aria-labelledby={`tickets-tab-${tab}`}>
				{error && !data ? (
					<LoadError error={error} onRetry={() => refetch()} notFoundTitle={t('state.loadError')} notFoundText={t('state.network')} />
				) : firstLoad ? (
					<ul className="tcards" aria-busy="true">
						<TicketCardSkeleton />
						<TicketCardSkeleton />
					</ul>
				) : list.length === 0 ? (
					<StateBlock
						icon={<Ticket size={28} />}
						title={tab === 'PAST' ? t('tickets.emptyPast') : t('tickets.emptyUpcoming')}
						text={tab === 'PAST' ? t('tickets.emptyPastText') : t('tickets.emptyUpcomingText')}
						actions={
							tab === 'UPCOMING' && (
								<Button component={Link} href={ROUTES.events} variant="contained">
									{t('orders.browse')}
								</Button>
							)
						}
					/>
				) : (
					<>
						{tab === 'UPCOMING' && (
							<div className="tickets__bulk">
								<Button
									variant="outlined"
									startIcon={<DownloadSimple size={20} aria-hidden="true" />}
									className={download.busy ? 'tz-blocked' : undefined}
									aria-disabled={download.busy ? true : undefined}
									aria-describedby="tickets-bulk-hint"
									onClick={() => {
										if (!download.busy) void download.downloadAll();
									}}
								>
									{download.busy ? t('tickets.downloadingAll') : t('tickets.downloadAll')}
								</Button>
								<p id="tickets-bulk-hint" className="breakdown__note">
									{t('tickets.downloadAllHint')}
								</p>
								<div role="status">
									{download.status?.kind === 'ok' && <p className="tz-alert tz-alert--success">{t('tickets.downloadedAll', { count: download.status.count })}</p>}
									{download.status?.kind === 'none' && <p className="tz-alert tz-alert--info">{t('tickets.downloadNone')}</p>}
									{download.status?.kind === 'error' && (
										<p className="tz-alert" role="alert">
											{t('ticket.downloadError')}
										</p>
									)}
								</div>
							</div>
						)}
						<ul className="tcards">
							{list.map((ticket) => (
								<TicketCard key={ticket._id} ticket={ticket} />
							))}
						</ul>
						<Pagination page={page} pageCount={pageCount} onChange={(next) => update({ page: next })} />
					</>
				)}
			</div>
		</>
	);
};

export default withLayoutBasic(withAccount(Tickets));
