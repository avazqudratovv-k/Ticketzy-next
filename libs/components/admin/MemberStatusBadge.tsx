import { useTranslation } from 'next-i18next';
import { CheckCircle, Clock, Prohibit, Trash, WarningCircle } from 'phosphor-react';
import { MemberStatus } from '../../enums/member.enum';

const TONE: Record<MemberStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
	ACTIVE: 'success',
	PENDING: 'warning',
	REJECTED: 'danger',
	SUSPENDED: 'danger',
	DELETE: 'neutral',
};
const ICON = { ACTIVE: CheckCircle, PENDING: Clock, REJECTED: WarningCircle, SUSPENDED: Prohibit, DELETE: Trash } as const;

/** Member status as text plus an icon and a tinted pill (never colour alone). */
const MemberStatusBadge = ({ status }: { status: MemberStatus }) => {
	const { t } = useTranslation('admin');
	const Icon = ICON[status] ?? Clock;
	return (
		<span className={`tz-badge tz-badge--${TONE[status] ?? 'neutral'}`}>
			<Icon size={14} weight="bold" aria-hidden="true" />
			{t(`memberStatus.${status}`)}
		</span>
	);
};

export default MemberStatusBadge;
