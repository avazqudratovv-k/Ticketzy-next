import { useTranslation } from 'next-i18next';
import { Hourglass, X } from 'phosphor-react';
import useWakeNote from '../../hooks/useWakeNote';

/**
 * A calm, dismissible line at the end of the page when the demo server is slow or unreachable (see useWakeNote).
 * It is in the flow, never over the content. The live region is always there so the text is announced.
 */
const WakeNote = ({ contained = false }: { contained?: boolean }) => {
	const { t } = useTranslation('common');
	const { visible, dismiss } = useWakeNote();
	return (
		<div className={`tz-wake${contained ? ' tz-container' : ''}`} role="status">
			{visible && (
				<div className="demo-notice tz-wake__note">
					<Hourglass size={20} aria-hidden="true" />
					<span className="demo-notice__text">{t('wakeNote')}</span>
					<button type="button" className="demo-notice__close" onClick={dismiss} aria-label={t('wakeDismiss')}>
						<X size={16} aria-hidden="true" />
					</button>
				</div>
			)}
		</div>
	);
};

export default WakeNote;
