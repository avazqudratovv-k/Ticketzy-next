import { NextPage } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { withOrganizerLayout } from '../../../libs/components/layout/LayoutAdmin';
import BlockedPanel from '../../../libs/components/organizer/BlockedPanel';
import EventEditor from '../../../libs/components/organizer/editor/EventEditor';
import useAuth from '../../../libs/hooks/useAuth';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common', 'organizer', 'events'])),
	},
});

/** A PENDING, REJECTED or SUSPENDED organizer cannot create events (backend DECISIONS #25), so the form is not even shown. */
const NewEvent: NextPage = () => {
	const { organizerAccess } = useAuth();
	useTranslation('organizer');
	if (organizerAccess && organizerAccess !== 'active') return <BlockedPanel access={organizerAccess} action="create" />;
	return <EventEditor />;
};

export default withOrganizerLayout(NewEvent);
