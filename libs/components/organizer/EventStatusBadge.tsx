import { useTranslation } from 'next-i18next';
import { CheckCircle, Clock, Prohibit, PencilSimple, WarningCircle, FlagCheckered } from 'phosphor-react';
import { EventStatus } from '../../types/event';

const TONE: Record<EventStatus, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
	DRAFT: 'neutral',
	PENDING: 'warning',
	APPROVED: 'success',
	REJECTED: 'danger',
	CANCELLED: 'danger',
	ENDED: 'info',
};

const ICON = {
	DRAFT: PencilSimple,
	PENDING: Clock,
	APPROVED: CheckCircle,
	REJECTED: WarningCircle,
	CANCELLED: Prohibit,
	ENDED: FlagCheckered,
} as const;

/** Event status as text plus an icon and a tinted pill (never colour alone). Lifecycle: backend DECISIONS #35. */
const EventStatusBadge = ({ status }: { status: EventStatus }) => {
	const { t } = useTranslation('organizer');
	const Icon = ICON[status];
	return (
		<span className={`tz-badge tz-badge--${TONE[status]}${status === 'DRAFT' ? ' org-badge--draft' : ''}`}>
			<Icon size={14} weight="bold" aria-hidden="true" />
			{t(`status.${status}`)}
		</span>
	);
};

export default EventStatusBadge;
