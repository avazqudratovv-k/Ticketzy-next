import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { formatNumber } from '../../../format';

export interface BarRow {
	key: string;
	name: string;
	value: number;
	/** second line, already formatted */
	detail?: string;
	selected?: boolean;
}

/**
 * Horizontal bars with the name on the left and the exact number and share on the right. Length shows size; the
 * numbers carry the meaning, so the chart reads the same without colour. `total` is the base for the share.
 */
const BarList = ({ rows, label, format, total }: { rows: BarRow[]; label: string; format: (value: number) => string; total: number }) => {
	const { t } = useTranslation('organizer');
	const { locale } = useRouter();
	const max = Math.max(1, ...rows.map((r) => r.value));
	return (
		<ul className="org-bars" aria-label={label}>
			{rows.map((row) => {
				const share = total > 0 ? Math.round((row.value / total) * 100) : 0;
				return (
					<li key={row.key} className={row.selected ? 'is-selected' : undefined}>
						<div className="org-bars__top">
							<span className="org-bars__name">{row.name}</span>
							<span className="org-bars__value">
								{format(row.value)} <span className="org-hint">{t('analytics.share', { percent: formatNumber(share, locale) })}</span>
							</span>
						</div>
						<div className="org-bars__track" aria-hidden="true">
							<span style={{ width: `${Math.max(row.value > 0 ? 2 : 0, (row.value / max) * 100)}%` }} />
						</div>
						{row.detail && <span className="org-row__meta">{row.detail}</span>}
					</li>
				);
			})}
		</ul>
	);
};

export default BarList;
