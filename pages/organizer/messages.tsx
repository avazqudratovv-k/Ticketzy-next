import { NextPage } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { withOrganizerLayout } from '../../libs/components/layout/LayoutAdmin';
import Inbox from '../../libs/components/messages/Inbox';
import { MemberType } from '../../libs/enums/member.enum';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common', 'messages', 'organizer'])),
	},
});

const OrganizerMessages: NextPage = () => <Inbox role={MemberType.ORGANIZER} />;

export default withOrganizerLayout(OrganizerMessages);
