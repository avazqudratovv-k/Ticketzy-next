import { memo, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { MagnifyingGlassMinus, MagnifyingGlassPlus, ArrowsOut } from 'phosphor-react';
import {
	layoutBounds,
	pitchOf,
	SEAT_FILL,
	seatCenter,
	seatKey,
	sectionBounds,
	sectionSize,
	tierColor,
} from '../../seats/layout';
import { readFocalArea } from '../../seats/focal';
import { pitchMarkings, pitchSurround, Rect } from '../../seats/surround';
import { FocalArea, LayoutSection, SeatRef, TakenSeat } from '../../seats/types';
import { seatVisual } from '../../seats/visual';

interface SectionProps {
	section: LayoutSection;
	color: string;
	taken: Map<string, TakenSeat>;
	selected: Set<string>;
	/** Seats of this section cannot be picked (the tier is sold out or not on sale) */
	locked: boolean;
	active: boolean;
	showRows: boolean;
}


/** Exported so the organizer's layout editor draws sections exactly as buyers see them. */
export const SectionSeats = memo(function SectionSeats({ section, color, taken, selected, locked, active, showRows }: SectionProps) {
	const { w, h } = sectionSize(section);
	const pitch = pitchOf(section);
	const size = pitch * SEAT_FILL;
	const seats = [];
	for (let row = 1; row <= section.rows; row += 1) {
		for (let number = 1; number <= section.seatsPerRow; number += 1) {
			const key = seatKey({ sectionKey: section.key, row, number });
			const state = seatVisual(taken.get(key), selected.has(key), locked);
			const c = seatCenter(section, row, number);
			seats.push(
				<g key={key} className={`seat seat--${state}`} data-seat={key}>
					<rect x={c.x - size / 2} y={c.y - size / 2} width={size} height={size} rx={size * 0.28} />
					{/* the icon is turned back by the section's rotation so it stays upright */}
					<g className="seat__icon" transform={`rotate(${-section.rotation} ${c.x} ${c.y})`}>
						{state === 'sold' && (
							<path
								d={`M${c.x - size * 0.22} ${c.y - size * 0.22}l${size * 0.44} ${size * 0.44}m0 ${-size * 0.44}l${-size * 0.44} ${size * 0.44}`}
							/>
						)}
						{(state === 'selected' || state === 'mine') && (
							<path d={`M${c.x - size * 0.26} ${c.y}l${size * 0.18} ${size * 0.2}l${size * 0.34} ${-size * 0.4}`} />
						)}
						{state === 'held' && <circle cx={c.x} cy={c.y} r={size * 0.14} />}
					</g>
				</g>,
			);
		}
	}
	const rowLabels = showRows
		? Array.from({ length: section.rows }, (_, i) => i + 1).map((row) => {
				const c = seatCenter(section, row, 0);
				return (
					<text
						key={row}
						className="seatmap__row"
						x={c.x - pitch * 0.5}
						y={c.y}
						transform={`rotate(${-section.rotation} ${c.x - pitch * 0.5} ${c.y})`}
						textAnchor="end"
						dominantBaseline="central"
					>
						{row}
					</text>
				);
		  })
		: null;
	return (
		<g
			className={`seatmap__section${active ? ' is-active' : ''}`}
			style={{ ['--tier' as string]: color }}
			transform={`translate(${section.x} ${section.y}) rotate(${section.rotation})`}
		>
			<rect
				className="seatmap__plate"
				data-section={section.key}
				x={-w / 2 - 6}
				y={-h / 2 - 6}
				width={w + 12}
				height={h + 12}
				rx={8}
			/>
			{seats}
			{rowLabels}
		</g>
	);
});

const rectOf = (r: Rect) => ({ x: r.x, y: r.y, width: r.w, height: r.h });

/**
 * The stage bar or the football pitch of a layout, on the venue canvas. Shared with the organizer's editor so both draw it the same.
 * The label is left out when the shape is too small to hold it.
 */
export const FocalShape = ({ focal, stageLabel, pitchLabel }: { focal: FocalArea; stageLabel: string; pitchLabel: string }) => {
	const cx = focal.x + focal.width / 2;
	const cy = focal.y + focal.height / 2;
	if (focal.type === 'PITCH') {
		const m = pitchMarkings(focal);
		const around = pitchSurround(focal);
		const right = focal.x + focal.width;
		const stripe = focal.width / 12;
		return (
			<g className="seatmap__pitch" data-focal="PITCH" pointerEvents="none">
				<g className="seatmap__surround" aria-hidden="true">
					<rect className="seatmap__runoff" {...rectOf(around.runoff)} />
					{around.boards.map((b, i) => (
						<rect key={i} className="seatmap__board" {...rectOf(b)} />
					))}
					{around.dugouts.map((d, i) => (
						<g key={i} className="seatmap__dugout">
							<rect {...rectOf(d)} rx={1.5} />
							<rect className="seatmap__dugout-roof" x={d.x} y={d.y} width={d.w} height={1.6} />
						</g>
					))}
					<rect className="seatmap__tunnel" {...rectOf(around.tunnel)} />
				</g>
				<rect className="seatmap__pitch-field" x={focal.x} y={focal.y} width={focal.width} height={focal.height} />
				{Array.from({ length: 6 }, (_, i) => (
					<rect key={i} className="seatmap__mow" x={focal.x + stripe * (i * 2 + 1)} y={focal.y} width={stripe} height={focal.height} />
				))}
				<g className="seatmap__lines">
					<rect x={focal.x} y={focal.y} width={focal.width} height={focal.height} />
					<line x1={cx} y1={focal.y} x2={cx} y2={focal.y + focal.height} />
					<circle cx={cx} cy={cy} r={m.circle} />
					{[-1, 1].map((side) => {
						const edge = side < 0 ? focal.x : right;
						const front = edge - side * m.penalty.w;
						const spotX = edge - side * m.spot;
						return (
							<g key={side}>
								<rect x={side < 0 ? edge : edge - m.penalty.w} y={cy - m.penalty.h / 2} width={m.penalty.w} height={m.penalty.h} />
								<rect x={side < 0 ? edge : edge - m.goalBox.w} y={cy - m.goalBox.h / 2} width={m.goalBox.w} height={m.goalBox.h} />
								<path d={`M${front} ${cy - m.arcDy}A${m.circle} ${m.circle} 0 0 ${side < 0 ? 1 : 0} ${front} ${cy + m.arcDy}`} />
								<circle className="seatmap__spot" cx={spotX} cy={cy} r={1.6} />
								<rect x={side < 0 ? edge - m.goal.depth : right} y={cy - m.goal.w / 2} width={m.goal.depth} height={m.goal.w} />
							</g>
						);
					})}
					<circle className="seatmap__spot" cx={cx} cy={cy} r={2} />
				</g>
				<text x={cx} y={focal.y + 16} textAnchor="middle" dominantBaseline="central">
					{pitchLabel}
				</text>
			</g>
		);
	}
	const radius = Math.min(11, focal.height / 2);
	return (
		<g className="seatmap__stage" data-focal="STAGE" pointerEvents="none">
			<rect x={focal.x} y={focal.y} width={focal.width} height={focal.height} rx={radius} />
			{focal.width >= 60 && focal.height >= 14 && (
				<text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
					{stageLabel}
				</text>
			)}
		</g>
	);
};

interface Props {
	sections: LayoutSection[];
	/** Stage or pitch from the venue layout; none (old data) reads as the default stage */
	focalArea?: FocalArea | null;
	tiers: Map<string, number>;
	taken: Map<string, TakenSeat>;
	selected: Set<string>;
	lockedTiers: Set<string>;
	activeSection: string | null;
	/** Text of the tooltip for a seat key (the page knows names and prices) */
	tooltip: (key: string) => string | null;
	onSeat: (ref: SeatRef) => void;
	onSection: (key: string) => void;
	/** Moves the view to this section when it changes */
	focusSection: string | null;
}

interface View {
	cx: number;
	cy: number;
	zoom: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const parseKey = (key: string): SeatRef => {
	const [sectionKey, row, number] = key.split(':');
	return { sectionKey, row: Number(row), number: Number(number) };
};

/** Interactive 2D seat map: SVG on the venue's canvas, zoom (wheel, pinch, buttons) and pan (drag). */
const SeatMap = ({ sections, focalArea, tiers, taken, selected, lockedTiers, activeSection, tooltip, onSeat, onSection, focusSection }: Props) => {
	const { t } = useTranslation('checkout');
	const focal = useMemo(() => readFocalArea(focalArea), [focalArea]);
	const bounds = useMemo(() => layoutBounds(sections, 36, focal), [sections, focal]);
	const [view, setView] = useState<View>({ cx: bounds.x + bounds.w / 2, cy: bounds.y + bounds.h / 2, zoom: 1 });
	const [hover, setHover] = useState<{ text: string; x: number; y: number } | null>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const pointers = useRef(new Map<number, { x: number; y: number }>());
	const drag = useRef({ moved: false, startX: 0, startY: 0, pinch: 0 });

	const fit = useCallback(
		() => setView({ cx: bounds.x + bounds.w / 2, cy: bounds.y + bounds.h / 2, zoom: 1 }),
		[bounds],
	);
	useEffect(fit, [fit]);

	const viewBox = useMemo(() => {
		const w = bounds.w / view.zoom;
		const h = bounds.h / view.zoom;
		const cx = Math.min(bounds.x + bounds.w - w / 2, Math.max(bounds.x + w / 2, view.cx));
		const cy = Math.min(bounds.y + bounds.h - h / 2, Math.max(bounds.y + h / 2, view.cy));
		return { x: cx - w / 2, y: cy - h / 2, w, h };
	}, [bounds, view]);

	const zoomAt = useCallback(
		(factor: number, point?: { x: number; y: number }) => {
			setView((current) => {
				const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * factor));
				if (!point) return { ...current, zoom };
				// Keep the point under the cursor fixed
				const ratio = current.zoom / zoom;
				return {
					zoom,
					cx: point.x - (point.x - current.cx) * ratio,
					cy: point.y - (point.y - current.cy) * ratio,
				};
			});
		},
		[],
	);

	const toSvg = (clientX: number, clientY: number) => {
		const svg = svgRef.current;
		const matrix = svg?.getScreenCTM();
		if (!svg || !matrix) return null;
		const point = svg.createSVGPoint();
		point.x = clientX;
		point.y = clientY;
		return point.matrixTransform(matrix.inverse());
	};

	// The wheel zooms around the cursor. It needs a non-passive listener to stop the page from scrolling.
	useEffect(() => {
		const element = wrapRef.current;
		if (!element) return undefined;
		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
			const point = toSvg(event.clientX, event.clientY);
			zoomAt(event.deltaY < 0 ? 1.18 : 1 / 1.18, point ?? undefined);
		};
		element.addEventListener('wheel', onWheel, { passive: false });
		return () => element.removeEventListener('wheel', onWheel);
	}, [zoomAt]);

	// Zoom to a section the buyer chose in the list
	useEffect(() => {
		if (!focusSection) return;
		const section = sections.find((s) => s.key === focusSection);
		if (!section) return;
		const box = sectionBounds(section);
		const zoom = Math.min(MAX_ZOOM, Math.max(1.5, Math.min(bounds.w / (box.w + 60), bounds.h / (box.h + 60))));
		setView({ cx: box.x + box.w / 2, cy: box.y + box.h / 2, zoom });
	}, [focusSection, sections, bounds]);

	const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
		pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
		drag.current = { moved: false, startX: event.clientX, startY: event.clientY, pinch: 0 };
	};

	const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
		const known = pointers.current.get(event.pointerId);
		if (!known) {
			// Hover: a tooltip on the seat under a mouse
			if (event.pointerType !== 'mouse') return;
			const key = (event.target as Element).closest?.('[data-seat]')?.getAttribute('data-seat');
			const text = key ? tooltip(key) : null;
			setHover(text && key ? { text, x: event.clientX, y: event.clientY } : null);
			return;
		}
		const previous = { ...known };
		pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
		const all = Array.from(pointers.current.values());
		const svg = svgRef.current;
		const matrix = svg?.getScreenCTM();
		if (!svg || !matrix) return;

		if (all.length >= 2) {
			const [a, b] = all;
			const distance = Math.hypot(a.x - b.x, a.y - b.y);
			if (drag.current.pinch) {
				const mid = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
				zoomAt(distance / drag.current.pinch, mid ?? undefined);
			}
			drag.current.pinch = distance;
			drag.current.moved = true;
			return;
		}

		const dx = event.clientX - previous.x;
		const dy = event.clientY - previous.y;
		if (!drag.current.moved && Math.hypot(event.clientX - drag.current.startX, event.clientY - drag.current.startY) < 5) return;
		drag.current.moved = true;
		setHover(null);
		svg.setPointerCapture?.(event.pointerId);
		setView((current) => ({ ...current, cx: current.cx - dx / matrix.a, cy: current.cy - dy / matrix.d }));
	};

	const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
		pointers.current.delete(event.pointerId);
		drag.current.pinch = 0;
	};

	const onClick = (event: React.MouseEvent<SVGSVGElement>) => {
		if (drag.current.moved) return;
		const target = event.target as Element;
		const seat = target.closest('[data-seat]')?.getAttribute('data-seat');
		if (seat) {
			onSeat(parseKey(seat));
			return;
		}
		const section = target.closest('[data-section]')?.getAttribute('data-section');
		if (section) onSection(section);
	};

	const showRows = view.zoom >= 2.4;

	return (
		<div className="seatmap">
			<div className="seatmap__toolbar">
				<button type="button" className="seatmap__btn" onClick={() => zoomAt(1 / 1.4)} aria-label={t('map.zoomOut')} disabled={view.zoom <= MIN_ZOOM}>
					<MagnifyingGlassMinus size={20} />
				</button>
				<span className="seatmap__zoom" aria-live="off">
					{Math.round(view.zoom * 100)}%
				</span>
				<button type="button" className="seatmap__btn" onClick={() => zoomAt(1.4)} aria-label={t('map.zoomIn')} disabled={view.zoom >= MAX_ZOOM}>
					<MagnifyingGlassPlus size={20} />
				</button>
				<button type="button" className="seatmap__fit" onClick={fit}>
					<ArrowsOut size={18} aria-hidden="true" /> {t('map.fit')}
				</button>
			</div>
			<div className="seatmap__wrap" ref={wrapRef} style={{ aspectRatio: `${bounds.w} / ${bounds.h}` }}>
				<svg
					ref={svgRef}
					className="seatmap__svg"
					viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
					role="img"
					aria-label={t('map.label')}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerCancel={onPointerUp}
					onPointerLeave={() => setHover(null)}
					onClick={onClick}
				>
					<FocalShape focal={focal} stageLabel={t('map.stage')} pitchLabel={t('map.pitch')} />
					{sections.map((section) =>
						section.kind === 'STANDING' ? (
							<StandingArea key={section.key} section={section} label={t('map.standing')} sub={t('map.standingNote')} />
						) : (
							<g key={section.key}>
								<SectionSeats
									section={section}
									color={tierColor(tiers.get(section.tierKey ?? ''))}
									taken={taken}
									selected={selected}
									locked={lockedTiers.has(section.tierKey ?? '')}
									active={activeSection === section.key}
									showRows={showRows}
								/>
								<text className="seatmap__name" x={section.x} y={sectionBounds(section).y - 7} textAnchor="middle">
									{section.name}
								</text>
							</g>
						),
					)}
				</svg>
				{hover && (
					<div className="seatmap__tip" style={{ left: hover.x, top: hover.y }} role="presentation">
						{hover.text}
					</div>
				)}
			</div>
		</div>
	);
};

export const StandingArea = ({ section, label, sub }: { section: LayoutSection; label: string; sub: string }) => {
	const { w, h } = sectionSize(section);
	return (
		<g className="seatmap__standing" transform={`translate(${section.x} ${section.y}) rotate(${section.rotation})`}>
			<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={10} />
			<g transform={`rotate(${-section.rotation})`}>
				<text y={-6} textAnchor="middle" className="seatmap__standing-title">
					{section.name}
				</text>
				<text y={10} textAnchor="middle">
					{label}
				</text>
				<text y={24} textAnchor="middle">
					{sub}
				</text>
			</g>
		</g>
	);
};

export default SeatMap;
