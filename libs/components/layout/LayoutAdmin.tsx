import { createDashboardLayout } from '../dashboard/DashboardShell';
import { MemberType } from '../../enums/member.enum';

/** Dashboard shell for ADMIN pages: grouped sunken sidebar, role badge, guarded by role. */
const withAdminLayout = createDashboardLayout(MemberType.ADMIN);

/** Dashboard shell for ORGANIZER pages: sidebar with Create event, guarded by role. */
export const withOrganizerLayout = createDashboardLayout(MemberType.ORGANIZER);

export default withAdminLayout;
