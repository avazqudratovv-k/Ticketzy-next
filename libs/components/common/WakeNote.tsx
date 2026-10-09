import { useTranslation } from 'next-i18next';
import useWakeNote from '../../hooks/useWakeNote';

/** A quiet line under the skeleton when the server is slow to answer (see useWakeNote). The live region is always there so the text is announced. */
const WakeNote = ({ contained = false }: { contained?: boolean }) => {
	const { t } = useTranslation('common');
	const visible = useWakeNote();
	return (
		<div className={`tz-wake${contained ? ' tz-container' : ''}`} role="status">
			{visible && <p className="tz-wake__text">{t('wakeNote')}</p>}
		</div>
	);
};

export default WakeNote;
