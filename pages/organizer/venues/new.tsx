import dynamic from 'next/dynamic';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { withOrganizerLayout } from '../../../libs/components/layout/LayoutAdmin';
import BlockedPanel from '../../../libs/components/organizer/BlockedPanel';

import useAuth from '../../../libs/hooks/useAuth';
import { organizerVenueEditUrl, safeEventReturn, withVenue } from '../../../libs/routes';

const VenueEditor = dynamic(() => import('../../../libs/components/organizer/venues/VenueEditor'), { ssr: false, loading: () => <div className="tz-skel lazy-skel" aria-hidden="true" /> });

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common', 'organizer', 'events', 'checkout'])),
	},
});

const NewVenue: NextPage = () => {
	const router = useRouter();
	const { organizerAccess } = useAuth();
	const returnTo = safeEventReturn(router.query.returnTo);
	if (organizerAccess && organizerAccess !== 'active') return <BlockedPanel access={organizerAccess} action="venues" />;
	if (!router.isReady) return null;
	return (
		<VenueEditor
			events={[]}
			returnTo={returnTo}
			onSaved={(venue) => {
				// From the event form the organizer goes straight back to it, with the new venue chosen
				void router.replace(returnTo ? withVenue(returnTo, venue._id) : organizerVenueEditUrl(venue._id) + '?created=1');
			}}
		/>
	);
};

export default withOrganizerLayout(NewVenue);
