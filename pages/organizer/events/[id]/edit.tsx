import dynamic from 'next/dynamic';
import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Prohibit, WarningCircle } from 'phosphor-react';
import { withOrganizerLayout } from '../../../../libs/components/layout/LayoutAdmin';
import BlockedPanel from '../../../../libs/components/organizer/BlockedPanel';

import StateBlock from '../../../../libs/components/states/StateBlock';
import useAuth from '../../../../libs/hooks/useAuth';
import { GET_EVENT_TICKET_TYPES, GET_MY_EVENT } from '../../../../apollo/organizer/query';
import { NETWORK_ERROR, parseApiError } from '../../../../libs/errors';
import { organizerEventsUrl } from '../../../../libs/routes';
import { OrgEvent, OrgTicketType } from '../../../../libs/organizer/types';

const EventEditor = dynamic(() => import('../../../../libs/components/organizer/editor/EventEditor'), { ssr: false, loading: () => <div className="tz-skel lazy-skel" aria-hidden="true" /> });

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: {
		...(await serverSideTranslations(locale as string, ['common', 'organizer', 'events'])),
	},
});

const EditEvent: NextPage = () => {
	const { t } = useTranslation('organizer');
	const router = useRouter();
	const { user, organizerAccess } = useAuth();
	const eventId = typeof router.query.id === 'string' ? router.query.id : '';
	const blocked = organizerAccess !== null && organizerAccess !== 'active';
	const skip = !router.isReady || !eventId || blocked;

	// `network-only`: the form must start from what the server holds now, not from a list cache
	const { data, error, loading, refetch } = useQuery(GET_MY_EVENT, { variables: { eventId }, skip, fetchPolicy: 'network-only' });
	const event: OrgEvent | undefined = data?.getEvent;
	const mine = event && user && event.organizerId === user._id;
	const { data: typeData, error: typeError, refetch: refetchTypes } = useQuery(GET_EVENT_TICKET_TYPES, {
		variables: { eventId },
		skip: skip || !mine,
		fetchPolicy: 'network-only',
	});

	if (organizerAccess && blocked) return <BlockedPanel access={organizerAccess} action="events" />;

	const network = error ? parseApiError(error).code === NETWORK_ERROR : typeError ? parseApiError(typeError).code === NETWORK_ERROR : false;
	if (network) {
		return (
			<StateBlock
				alert
				icon={<WarningCircle size={28} />}
				title={t('edit.loadError.title')}
				text={t('errors.network')}
				actions={
					<Button variant="outlined" onClick={() => { void refetch(); void refetchTypes(); }}>
						{t('errors.retry')}
					</Button>
				}
			/>
		);
	}
	if ((error && !event) || (event && !mine)) {
		return (
			<StateBlock
				icon={<Prohibit size={28} />}
				title={t('edit.notFound.title')}
				text={t('edit.notFound.text')}
				actions={
					<Button component={Link} href={organizerEventsUrl} variant="outlined">
						{t('form.backToList')}
					</Button>
				}
			/>
		);
	}
	if (!event || (!typeData && !typeError) || loading) return <div className="org-page" aria-busy="true"><span className="tz-skel tz-skel--block" /></div>;

	return <EventEditor key={event._id} event={event} ticketTypes={(typeData?.getTicketTypes ?? []) as OrgTicketType[]} />;
};

export default withOrganizerLayout(EditEvent);
