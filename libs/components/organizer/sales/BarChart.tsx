import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';

export interface BarPoint {
	key: string;
	label: string;
	value: number;
	/** the readout sentence for this bar, already formatted */
	text: string;
}

interface Props {
	points: BarPoint[];
	/** names the chart for assistive tech and the hidden table */
	label: string;
	valueHeader: string;
	/** formats a value for the hidden table */
	format: (value: number) => string;
	hint: string;
}

const H = 200;
const PAD = { top: 12, right: 8, bottom: 26, left: 8 };

/**
 * Vertical bars over time. One series, one colour: the title names the measure and every bar has a number in the
 * readout (hover or keyboard focus) and in the table behind "View as table", so nothing depends on colour.
 */
const BarChart = ({ points, label, valueHeader, format, hint }: Props) => {
	const { t } = useTranslation('organizer');
	const [active, setActive] = useState<number | null>(null);
	const [table, setTable] = useState(false);
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
	const max = Math.max(1, ...points.map((p) => p.value));
	const step = (W - PAD.left - PAD.right) / points.length;
	const barW = Math.max(3, step - (step > 12 ? 4 : 2));
	const innerH = H - PAD.top - PAD.bottom;
	const current = active !== null ? points[active] : null;
	const best = points.reduce((b, p) => (p.value > b.value ? p : b), points[0]);
	const ticks = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]));

	return (
		<figure className="org-chart" ref={box}>
			<div className="org-chart__readout" aria-live="polite">
				{current ? <strong>{current.text}</strong> : <span className="org-hint">{hint}</span>}
			</div>
			<svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="group" aria-label={label} className="org-chart__svg" onMouseLeave={() => setActive(null)}>
				<line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} className="org-chart__axis" />
				<line x1={PAD.left} x2={W - PAD.right} y1={PAD.top} y2={PAD.top} className="org-chart__grid" />
				<text x={W - PAD.right} y={PAD.top - 2} textAnchor="end" className="org-chart__tick">
					{format(max)}
				</text>
				{points.map((p, i) => {
					const h = p.value > 0 ? Math.max(3, (p.value / max) * innerH) : 0;
					const x = PAD.left + i * step + (step - barW) / 2;
					return (
						<g key={p.key}>
							{h > 0 && <rect x={x} y={H - PAD.bottom - h} width={barW} height={h} rx={2} className={`org-chart__bar${active === i ? ' is-active' : ''}`} />}
							<rect
								x={PAD.left + i * step}
								y={0}
								width={step}
								height={H - PAD.bottom}
								fill="transparent"
								role="img"
								tabIndex={0}
								aria-label={p.text}
								onMouseEnter={() => setActive(i)}
								onFocus={() => setActive(i)}
								onBlur={() => setActive(null)}
							/>
						</g>
					);
				})}
				{ticks.map((i, n) => (
					<text key={i} x={PAD.left + i * step + step / 2} y={H - 8} textAnchor={n === 0 ? 'start' : n === ticks.length - 1 ? 'end' : 'middle'} className="org-chart__tick">
						{points[i].label}
					</text>
				))}
			</svg>
			{best && best.value > 0 && <p className="org-hint">{t('analytics.chart.best', { text: best.text })}</p>}
			<button type="button" className="tz-link org-linkbtn" aria-expanded={table} onClick={() => setTable((v) => !v)}>
				{table ? t('analytics.chart.hideTable') : t('analytics.chart.showTable')}
			</button>
			{table && (
				<div className="org-minitable" tabIndex={0} role="region" aria-label={label}>
					<table>
						<caption className="org-visually-hidden">{label}</caption>
						<thead>
							<tr>
								<th scope="col">{t('analytics.chart.day')}</th>
								<th scope="col" className="org-num">
									{valueHeader}
								</th>
							</tr>
						</thead>
						<tbody>
							{points.map((p) => (
								<tr key={p.key}>
									<th scope="row">{p.label}</th>
									<td className="org-num">{format(p.value)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</figure>
	);
};

export default BarChart;
