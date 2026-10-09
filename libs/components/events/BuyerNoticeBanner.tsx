import { useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { Info } from 'phosphor-react';
import useBuyerNotice from '../../hooks/useBuyerNotice';

/** Shows the "only buyer accounts can buy" message once after a blocked member was sent away from a purchase page. */
const BuyerNoticeBanner = () => {
	const { t } = useTranslation('common');
	const anchor = useRef<HTMLDivElement>(null);
	const notice = useBuyerNotice(anchor, true);
	return (
		<div ref={anchor} role="status">
			{notice.visible && (
				<div className="tz-alert tz-alert--warning">
					<span className="tz-alert__icon" aria-hidden="true">
						<Info size={16} />
					</span>
					<div>
						<div className="tz-alert__text">{t('buyerOnly.message')}</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default BuyerNoticeBanner;
