import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { ArrowUUpLeft, Prohibit } from 'phosphor-react';
import { getRefundState, RefundPolicy } from '../../refundPolicy';
import { formatRefundDeadline } from '../../refundText';

interface Props {
	policy?: Partial<RefundPolicy> | null;
	startAt: string;
	/** IANA zone of the venue: the deadline is the end of a calendar day on its clock */
	timeZone?: string | null;
	className?: string;
}

/**
 * The refund policy of an event in plain words, with the real deadline: "Refundable until Fri, 12 Dec 2026 · 23:59 (GMT+9)",
 * "Non-refundable", or (when the deadline is already behind us) that tickets bought now can't be refunded. The server decides
 * every refund; this only tells the buyer. "Closed" is judged after mount so the server and the browser render the same text.
 */
const RefundPolicyNote = ({ policy, startAt, timeZone, className }: Props) => {
	const { t } = useTranslation('events');
	const { locale } = useRouter();
	const [now, setNow] = useState<Date | null>(null);
	useEffect(() => setNow(new Date()), []);
	const zone = timeZone || 'Asia/Seoul';
	const state = getRefundState({ refundPolicy: policy }, startAt, zone, now ?? new Date(0));

	if (state.kind === 'NON_REFUNDABLE') {
		return (
			<div className={`tz-refund tz-refund--none ${className ?? ''}`} data-refund="NON_REFUNDABLE">
				<Prohibit size={22} aria-hidden="true" />
				<div>
					<strong>{t('refund.nonRefundable')}</strong>
					<span>{t('refund.nonRefundableText')}</span>
				</div>
			</div>
		);
	}
	const date = formatRefundDeadline(state.deadline, locale, zone);
	if (state.kind === 'CLOSED') {
		return (
			<div className={`tz-refund tz-refund--closed ${className ?? ''}`} data-refund="CLOSED">
				<Prohibit size={22} aria-hidden="true" />
				<div>
					<strong>{t('refund.windowClosed')}</strong>
					<span>{t('refund.closedNow', { date })}</span>
				</div>
			</div>
		);
	}
	return (
		<div className={`tz-refund ${className ?? ''}`} data-refund="REFUNDABLE">
			<ArrowUUpLeft size={22} aria-hidden="true" />
			<div>
				<strong>{t('refund.refundable', { date })}</strong>
				<span>{t('refund.rule', { when: t('refund.daysBefore', { count: state.daysBefore }) })}</span>
			</div>
		</div>
	);
};

export default RefundPolicyNote;
