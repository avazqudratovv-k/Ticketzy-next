import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { DayPoint } from '../../organizer/salesSeries';
import { formatNumber, formatPrice } from '../../format';

interface Props {
	points: DayPoint[];
	currency: string;
	locale?: string;
}

const H = 200;
const PAD = { top: 12, right: 8, bottom: 26, left: 8 };

const dayLabel = (day: string, locale?: string) => new Intl.DateTimeFormat(locale === 'uz' ? 'en-GB' : locale === 'ko' ? 'ko-KR' : locale === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${day}T12:00:00`));

/** Revenue per day, one series, so one colour and no legend; the title names it. A hidden table carries the same numbers. */
const SalesChart = ({ points, currency, locale }: Props) => {
	const { t } = useTranslation('organizer');
	const [active, setActive] = useState<number | null>(null);
	// the drawing uses the real width, so labels keep their size on a phone
	const box = useRef<HTMLElement>(null);
	const [W, setW] = useState(720);
	useEffect(() => {
		const el = box.current;
		if (!el || typeof ResizeObserver === 'undefined') return undefined;
		const observer = new ResizeObserver(() => setW(Math.max(260, Math.round(el.clientWidth))));
		observer.observe(el);
		setW(Math.max(260, Math.round(el.clientWidth)));
		return () => observer.disconnect();
	}, []);
	const max = Math.max(1, ...points.map((p) => p.revenue));
	const step = (W - PAD.left - PAD.right) / points.length;
	const barW = Math.max(3, step - (step > 12 ? 4 : 2));
	const innerH = H - PAD.top - PAD.bottom;
	const current = active !== null ? points[active] : null;
	const money = (n: number) => formatPrice(n, locale, currency);

	return (
		<figure className="org-chart" ref={box}>
			<div className="org-chart__readout" aria-live="polite">
				{current ? (
					<>
						<strong>{dayLabel(current.day, locale)}</strong> · {money(current.revenue)} · {t('dashboard.chart.orders', { count: current.orders })}
					</>
				) : (
					<span className="org-hint">{t('dashboard.chart.hover')}</span>
				)}
			</div>
			<svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="group" aria-label={t('dashboard.chart.label')} className="org-chart__svg" onMouseLeave={() => setActive(null)}>
				<line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} className="org-chart__axis" />
				{points.map((p, i) => {
					const h = p.revenue > 0 ? Math.max(3, (p.revenue / max) * innerH) : 0;
					const x = PAD.left + i * step + (step - barW) / 2;
					return (
						<g key={p.day}>
							{h > 0 && <rect x={x} y={H - PAD.bottom - h} width={barW} height={h} rx={2} className={`org-chart__bar${active === i ? ' is-active' : ''}`} />}
							<rect
								x={PAD.left + i * step}
								y={0}
								width={step}
								height={H - PAD.bottom}
								fill="transparent"
								role="img"
								tabIndex={0}
								aria-label={`${dayLabel(p.day, locale)}: ${money(p.revenue)}`}
								onMouseEnter={() => setActive(i)}
								onFocus={() => setActive(i)}
								onBlur={() => setActive(null)}
							/>
						</g>
					);
				})}
				{[0, Math.floor((points.length - 1) / 2), points.length - 1].map((i, n) => (
					<text key={n} x={PAD.left + i * step + step / 2} y={H - 8} textAnchor={n === 0 ? 'start' : n === 2 ? 'end' : 'middle'} className="org-chart__tick">
						{dayLabel(points[i].day, locale)}
					</text>
				))}
			</svg>
			<table className="org-visually-hidden">
				<caption>{t('dashboard.chart.label')}</caption>
				<thead>
					<tr>
						<th>{t('dashboard.chart.day')}</th>
						<th>{t('dashboard.revenue')}</th>
						<th>{t('dashboard.chart.ordersCol')}</th>
					</tr>
				</thead>
				<tbody>
					{points.map((p) => (
						<tr key={p.day}>
							<td>{p.day}</td>
							<td>{money(p.revenue)}</td>
							<td>{formatNumber(p.orders, locale)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</figure>
	);
};

export default SalesChart;
