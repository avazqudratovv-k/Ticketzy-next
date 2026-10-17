import { useEffect } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Heart } from 'phosphor-react';
import { GET_MY_FAVORITES } from '../../apollo/user/query';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import { withAccount } from '../../libs/components/account/AccountShell';
import PageHead from '../../libs/components/account/PageHead';
import LoadError from '../../libs/components/account/LoadError';
import EventCard, { EventGridSkeleton } from '../../libs/components/events/EventCard';
import Pagination from '../../libs/components/events/Pagination';
import Seo from '../../libs/components/common/Seo';
import StateBlock from '../../libs/components/states/StateBlock';
import useUrlState from '../../libs/hooks/useUrlState';
import { ROUTES } from '../../libs/routes';
import { EventItem } from '../../libs/types/event';

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'events', 'checkout', 'account'])) },
});

const PAGE_SIZE = 12;

/** Events the member liked (`getFavorites`). */
const Saved: NextPage = () => {
	const { t } = useTranslation('account');
	const { page, ready, update } = useUrlState('_');
	const { data, loading, error, refetch } = useQuery(GET_MY_FAVORITES, {
		variables: { input: { page, limit: PAGE_SIZE } },
		skip: !ready,
		fetchPolicy: 'cache-and-network',
	});
	const list: EventItem[] = data?.getFavorites?.list ?? [];
	const total: number = data?.getFavorites?.metaCounter?.[0]?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

	useEffect(() => {
		if (data && page > pageCount) update({ page: pageCount });
	}, [data, page, pageCount, update]);

	return (
		<>
			<Seo title={t('saved.title')} noindex />
			<PageHead title={t('saved.title')} text={t('saved.sub')} />
			{error && !data ? (
				<LoadError error={error} onRetry={() => refetch()} notFoundTitle={t('state.loadError')} notFoundText={t('state.network')} />
			) : !data && (loading || !ready) ? (
				<EventGridSkeleton count={4} />
			) : list.length === 0 ? (
				<StateBlock
					icon={<Heart size={28} />}
					title={t('saved.emptyTitle')}
					text={t('saved.emptyText')}
					actions={
						<Button component={Link} href={ROUTES.events} variant="contained">
							{t('orders.browse')}
						</Button>
					}
				/>
			) : (
				<>
					<div className="tz-grid">
						{list.map((event) => (
							<EventCard key={event._id} event={event} headingLevel={2} />
						))}
					</div>
					<Pagination page={page} pageCount={pageCount} onChange={(next) => update({ page: next })} />
				</>
			)}
		</>
	);
};

export default withLayoutBasic(withAccount(Saved));
