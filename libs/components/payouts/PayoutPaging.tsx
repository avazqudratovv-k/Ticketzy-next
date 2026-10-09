import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import Pagination from '../events/Pagination';
import { formatNumber } from '../../format';
import { PAYOUTS_PAGE_SIZE } from '../../payouts';

/** "Showing 1–10 of 23" and the page buttons under a payouts list. */
const PayoutPaging = ({ page, total, shown, onChange }: { page: number; total: number; shown: number; onChange: (page: number) => void }) => {
	const { t } = useTranslation('common');
	const { locale } = useRouter();
	const pageCount = Math.max(1, Math.ceil(total / PAYOUTS_PAGE_SIZE));
	return (
		<div className="org-foot">
			<p>
				{t('payoutList.showing', {
					from: formatNumber((page - 1) * PAYOUTS_PAGE_SIZE + 1, locale),
					to: formatNumber((page - 1) * PAYOUTS_PAGE_SIZE + shown, locale),
					total: formatNumber(total, locale),
				})}
			</p>
			<Pagination page={Math.min(page, pageCount)} pageCount={pageCount} onChange={onChange} />
		</div>
	);
};

export default PayoutPaging;
