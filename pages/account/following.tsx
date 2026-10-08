import { useEffect } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { UsersThree } from 'phosphor-react';
import { GET_MY_FOLLOWINGS } from '../../apollo/user/query';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import { withAccount } from '../../libs/components/account/AccountShell';
import PageHead from '../../libs/components/account/PageHead';
import LoadError from '../../libs/components/account/LoadError';
import OrganizerAvatar from '../../libs/components/common/OrganizerAvatar';
import Pagination from '../../libs/components/events/Pagination';
import Seo from '../../libs/components/common/Seo';
import StateBlock from '../../libs/components/states/StateBlock';
import useAuth from '../../libs/hooks/useAuth';
import useUrlState from '../../libs/hooks/useUrlState';
import { organizerUrl, ROUTES } from '../../libs/routes';

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'events', 'checkout', 'account'])) },
});

const PAGE_SIZE = 12;

interface FollowingRow {
	_id: string;
	followingId: string;
	followingData?: { _id: string; memberNick?: string | null; memberFullName?: string | null; memberImage?: string | null; memberEvents?: number } | null;
}

/** Organizers the member follows (`getMemberFollowings`). */
const Following: NextPage = () => {
	const { t } = useTranslation('account');
	const { user } = useAuth();
	const { page, ready, update } = useUrlState('_');
	const { data, loading, error, refetch } = useQuery(GET_MY_FOLLOWINGS, {
		variables: { input: { page, limit: PAGE_SIZE, search: { followerId: user?._id } } },
		skip: !ready || !user,
		fetchPolicy: 'cache-and-network',
	});
	const list: FollowingRow[] = (data?.getMemberFollowings?.list ?? []).filter((row: FollowingRow) => row.followingData);
	const total: number = data?.getMemberFollowings?.metaCounter?.[0]?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

	useEffect(() => {
		if (data && page > pageCount) update({ page: pageCount });
	}, [data, page, pageCount, update]);

	return (
		<>
			<Seo title={t('following.title')} noindex />
			<PageHead title={t('following.title')} text={t('following.sub')} />
			{error && !data ? (
				<LoadError error={error} onRetry={() => refetch()} notFoundTitle={t('state.loadError')} notFoundText={t('state.network')} />
			) : !data && (loading || !ready) ? (
				<span className="tz-skel tz-skel--block" aria-busy="true" />
			) : list.length === 0 ? (
				<StateBlock
					icon={<UsersThree size={28} />}
					title={t('following.emptyTitle')}
					text={t('following.emptyText')}
					actions={
						<Button component={Link} href={ROUTES.events} variant="contained">
							{t('orders.browse')}
						</Button>
					}
				/>
			) : (
				<>
					<ul className="follow-list">
						{list.map((row) => {
							const org = row.followingData!;
							return (
								<li key={row._id}>
									<Link href={organizerUrl(org._id)} className="follow-list__item">
										<OrganizerAvatar member={org} size={48} />
										<span>
											<strong>{org.memberFullName || org.memberNick}</strong>
											<span>{t('following.events', { count: org.memberEvents ?? 0 })}</span>
										</span>
									</Link>
								</li>
							);
						})}
					</ul>
					<Pagination page={page} pageCount={pageCount} onChange={(next) => update({ page: next })} />
				</>
			)}
		</>
	);
};

export default withLayoutBasic(withAccount(Following));
