import { useTranslation } from 'next-i18next';
import { ArrowUUpLeft, CheckCircle, Ticket } from 'phosphor-react';

const TONE = { VALID: 'success', USED: 'neutral', REFUNDED: 'info' } as const;
const ICON = { VALID: Ticket, USED: CheckCircle, REFUNDED: ArrowUUpLeft } as const;

/** Ticket status as text plus an icon and a tinted pill (never colour alone). */
const TicketStatusBadge = ({ status }: { status: string }) => {
	const { t } = useTranslation('organizer');
	const key = (status in TONE ? status : 'VALID') as keyof typeof TONE;
	const Icon = ICON[key];
	return (
		<span className={`tz-badge tz-badge--${TONE[key]}`}>
			<Icon size={14} weight="bold" aria-hidden="true" />
			{status in TONE ? t(`attendees.status.${key}`) : status}
		</span>
	);
};

export default TicketStatusBadge;
