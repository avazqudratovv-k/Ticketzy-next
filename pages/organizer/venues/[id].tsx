import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useApolloClient, useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Prohibit, WarningCircle } from 'phosphor-react';
import { withOrganizerLayout } from '../../../libs/components/layout/LayoutAdmin';
import BlockedPanel from '../../../libs/components/organizer/BlockedPanel';

import StateBlock from '../../../libs/components/states/StateBlock';
import useAuth from '../../../libs/hooks/useAuth';
import { GET_VENUE_FULL } from '../../../apollo/organizer/venue';
import { NETWORK_ERROR, parseApiError } from '../../../libs/errors';
import { organizerVenuesUrl, safeEventReturn } from '../../../libs/routes';
import { VenueRecord } from '../../../libs/venues/types';
import { fetchMyEvents, VenueEvent } from '../../../libs/venues/useVenueData';

const VenueEditor = dynamic(() => import('../../../libs/components/organizer/venues/VenueEditor'), { ssr: false, loading: () => <div className="tz-skel lazy-skel" aria-hidden="true" /> });

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: {
		...(await serverSideTranslations(locale as string, ['common', 'organizer', 'events', 'checkout'])),
	},
});

const EditVenue: NextPage = () => {
	const { t } = useTranslation('organizer');
	const router = useRouter();
	const client = useApolloClient();
	const { user, organizerAccess } = useAuth();
	const venueId = typeof router.query.id === 'string' ? router.query.id : '';
	const returnTo = safeEventReturn(router.query.returnTo);
	const blocked = organizerAccess !== null && organizerAccess !== 'active';
	const skip = !router.isReady || !venueId || blocked;
	const [events, setEvents] = useState<VenueEvent[] | null>(null);
	const [eventsError, setEventsError] = useState(false);
	const [reload, setReload] = useState(0);

	// `network-only`: the editor must start from what the server holds now
	const { data, error, loading, refetch } = useQuery(GET_VENUE_FULL, { variables: { venueId }, skip, fetchPolicy: 'network-only' });
	const venue: VenueRecord | undefined = data?.getVenue;

	useEffect(() => {
		if (skip) return undefined;
		let alive = true;
		setEventsError(false);
		fetchMyEvents(client)
			.then((list) => alive && setEvents(list))
			.catch(() => alive && setEventsError(true));
		return () => {
			alive = false;
		};
	}, [client, skip, venueId, reload]);

	if (organizerAccess && blocked) return <BlockedPanel access={organizerAccess} action="venues" />;

	const network = error ? parseApiError(error).code === NETWORK_ERROR : false;
	const retry = () => {
		void refetch();
		setReload((n) => n + 1);
	};
	if (network || eventsError) {
		return (
			<StateBlock
				alert
				icon={<WarningCircle size={28} />}
				title={t('venues.edit.loadError.title')}
				text={network ? t('errors.network') : t('venues.edit.loadError.text')}
				actions={
					<Button variant="outlined" onClick={retry}>
						{t('errors.retry')}
					</Button>
				}
			/>
		);
	}
	if (error && !venue) {
		return (
			<StateBlock
				icon={<Prohibit size={28} />}
				title={t('venues.edit.notFound.title')}
				text={t('venues.edit.notFound.text')}
				actions={
					<Button component={Link} href={organizerVenuesUrl} variant="outlined">
						{t('venues.form.backToList')}
					</Button>
				}
			/>
		);
	}
	if (!venue || !events || loading) {
		return (
			<div className="org-page" aria-busy="true">
				<span className="tz-skel tz-skel--block" />
			</div>
		);
	}

	const foreign = !user || venue.memberId !== user._id;
	return (
		<VenueEditor
			key={venue._id}
			venue={venue}
			foreign={foreign}
			events={events.filter((event) => event.venueId === venue._id)}
			returnTo={returnTo}
			onSaved={() => undefined}
		/>
	);
};

export default withOrganizerLayout(EditVenue);
