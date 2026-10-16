import { useTranslation } from 'next-i18next';
import { ArrowUUpLeft, CheckCircle, Clock, Prohibit, QrCode, WarningCircle, XCircle } from 'phosphor-react';
import { ScanOutcome } from '../../../organizer/checkin';
import TicketCode from '../../common/TicketCode';

const ICON = {
	valid: CheckCircle,
	used: XCircle,
	wrongEvent: WarningCircle,
	refunded: ArrowUUpLeft,
	invalid: QrCode,
	notOpen: Clock,
	notAllowed: Prohibit,
	codeNotFound: QrCode,
	badCode: QrCode,
	rateLimited: Clock,
	network: WarningCircle,
	error: WarningCircle,
} as const;

/** valid is green, a ticket that must be refused is red, a problem with the gate setup is amber; always an icon and a sentence, never colour alone */
const TONE: Record<ScanOutcome, 'success' | 'danger' | 'warning'> = {
	valid: 'success',
	used: 'danger',
	wrongEvent: 'warning',
	refunded: 'danger',
	invalid: 'danger',
	notOpen: 'warning',
	notAllowed: 'warning',
	codeNotFound: 'danger',
	badCode: 'warning',
	rateLimited: 'warning',
	network: 'warning',
	error: 'warning',
};

interface Props {
	outcome: ScanOutcome;
	buyer?: string;
	place?: string;
	code?: string;
	/** the server's own words, shown for a message that has no translation */
	raw?: string;
	/** only for `rateLimited`: seconds until the next try */
	retryAfterSeconds?: number;
}

const ScanResult = ({ outcome, buyer, place, code, raw, retryAfterSeconds }: Props) => {
	const { t } = useTranslation('organizer');
	const Icon = ICON[outcome];
	return (
		<div className={`org-result org-result--${TONE[outcome]}`} role={outcome === 'valid' ? 'status' : 'alert'}>
			<span className="org-result__icon" aria-hidden="true">
				<Icon size={48} weight="fill" />
			</span>
			<div className="org-result__body">
				<h2 className="org-result__title">{t(`checkin.result.${outcome}.title`)}</h2>
				{(buyer || place) && <p className="org-result__who">{[buyer, place].filter(Boolean).join(' · ')}</p>}
				{code && (
					<p className="org-result__code">
						<TicketCode code={code} />
					</p>
				)}
				<p className="org-result__text">{outcome === 'error' && raw ? raw : t(`checkin.result.${outcome}.text`, { seconds: retryAfterSeconds ?? 60 })}</p>
			</div>
		</div>
	);
};

export default ScanResult;
