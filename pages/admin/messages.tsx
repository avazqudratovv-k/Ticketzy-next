import { NextPage, GetStaticPropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withAdminLayout from '../../libs/components/layout/LayoutAdmin';
import Inbox from '../../libs/components/messages/Inbox';
import { MemberType } from '../../libs/enums/member.enum';

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: {
		...(await serverSideTranslations(locale ?? 'en', ['common', 'messages', 'organizer', 'admin'])),
	},
});

const AdminMessages: NextPage = () => <Inbox role={MemberType.ADMIN} />;

export default withAdminLayout(AdminMessages);
