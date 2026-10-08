import { useTranslation } from 'next-i18next';
import { CaretLeft, CaretRight } from 'phosphor-react';
import { useRouter } from 'next/router';
import { formatNumber } from '../../format';

/** First, last, current and one neighbour on each side; the rest collapses into gaps (design: Pagination). */
export const pageItems = (current: number, count: number): (number | 'gap')[] => {
	const wanted = new Set([1, count, current - 1, current, current + 1].filter((n) => n >= 1 && n <= count));
	const sorted = Array.from(wanted).sort((a, b) => a - b);
	const out: (number | 'gap')[] = [];
	sorted.forEach((n, index) => {
		if (index > 0 && n - sorted[index - 1] > 1) out.push('gap');
		out.push(n);
	});
	return out;
};

interface Props {
	page: number;
	pageCount: number;
	onChange: (page: number) => void;
}

const Pagination = ({ page, pageCount, onChange }: Props) => {
	const { t } = useTranslation('events');
	const { locale } = useRouter();
	if (pageCount <= 1) return null;
	const go = (n: number) => (event: React.MouseEvent) => {
		event.preventDefault();
		onChange(n);
	};

	return (
		<nav className="tz-pagination" aria-label={t('pagination.label')}>
			<ul className="tz-pagination__pages">
				<li>
					<button
						type="button"
						className="tz-page"
						aria-label={t('pagination.previous')}
						disabled={page <= 1}
						onClick={go(page - 1)}
					>
						<CaretLeft size={18} aria-hidden="true" />
					</button>
				</li>
				{pageItems(page, pageCount).map((item, index) =>
					item === 'gap' ? (
						<li key={`gap-${index}`} className="tz-page-num">
							<span className="tz-page tz-page--gap" aria-hidden="true">
								…
							</span>
						</li>
					) : (
						<li key={item} className="tz-page-num">
							<button
								type="button"
								className="tz-page"
								aria-current={item === page ? 'page' : undefined}
								aria-label={t('pagination.goTo', { page: item })}
								onClick={go(item)}
							>
								{formatNumber(item, locale)}
							</button>
						</li>
					),
				)}
				<li className="tz-pagination__compact">{t('pagination.compact', { page, count: pageCount })}</li>
				<li>
					<button
						type="button"
						className="tz-page"
						aria-label={t('pagination.next')}
						disabled={page >= pageCount}
						onClick={go(page + 1)}
					>
						<CaretRight size={18} aria-hidden="true" />
					</button>
				</li>
			</ul>
		</nav>
	);
};

export default Pagination;
