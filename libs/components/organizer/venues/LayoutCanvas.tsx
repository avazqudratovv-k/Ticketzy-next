import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { ArrowsOut, GridFour, Magnet, MagnifyingGlassMinus, MagnifyingGlassPlus } from 'phosphor-react';
import { FocalShape, SectionSeats, StandingArea } from '../../seats/SeatMap';
import { FOCAL_CANVAS, MIN_STAGE } from '../../../seats/focal';
import { sectionBounds, tierColor, tierIndexes } from '../../../seats/layout';
import { FocalArea, TakenSeat } from '../../../seats/types';
import { asLayoutSections, boundsOf, CANVAS, clampToCanvas, DraftSection, GRID, Layout, layoutSectionOf, SectionIssues, sizeOf, snap } from '../../../venues/model';

const NONE_TAKEN = new Map<string, TakenSeat>();
const NONE_SELECTED = new Set<string>();

/** Room around the canvas so a legacy section that sticks out of it can still be reached. */
const MARGIN = 50;
const FULL = { x: -MARGIN, y: -MARGIN, w: CANVAS.w + MARGIN * 2, h: CANVAS.h + MARGIN * 2 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

interface View {
	cx: number;
	cy: number;
	zoom: number;
}
const FIT: View = { cx: FULL.x + FULL.w / 2, cy: FULL.y + FULL.h / 2, zoom: 1 };

/** The corners and the middle of the left and right sides: what a STAGE can be pulled by. */
type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'w' | 'e';
const HANDLES: Handle[] = ['nw', 'ne', 'sw', 'se', 'w', 'e'];
type StageRect = Pick<FocalArea, 'x' | 'y' | 'width' | 'height'>;

const handlePoint = (stage: StageRect, handle: Handle) => ({
	x: handle.includes('w') ? stage.x : stage.x + stage.width,
	y: handle === 'w' || handle === 'e' ? stage.y + stage.height / 2 : handle.startsWith('n') ? stage.y : stage.y + stage.height,
});

/** The stage after a handle is pulled to the point (px, py): the opposite side stays where it is. */
function resizeStage(orig: StageRect, handle: Handle, px: number, py: number): StageRect {
	const right = orig.x + orig.width;
	const bottom = orig.y + orig.height;
	const x = Math.min(FOCAL_CANVAS.width, Math.max(0, px));
	const y = Math.min(FOCAL_CANVAS.height, Math.max(0, py));
	let next = { ...orig };
	if (handle.includes('w')) {
		const left = Math.min(x, right - MIN_STAGE.width);
		next = { ...next, x: left, width: right - left };
	}
	if (handle.includes('e')) next = { ...next, width: Math.max(MIN_STAGE.width, x - orig.x) };
	if (handle.startsWith('n')) {
		const top = Math.min(y, bottom - MIN_STAGE.height);
		next = { ...next, y: top, height: bottom - top };
	}
	if (handle.startsWith('s')) next = { ...next, height: Math.max(MIN_STAGE.height, y - orig.y) };
	return next;
}

interface Props {
	layout: Layout;
	/** Stage or pitch. A pitch is drawn at its fixed size and has no handles. */
	focal: FocalArea;
	focalSelected: boolean;
	onSelectFocal: () => void;
	/** A stage drag or resize in progress (not an undo step yet) */
	onStagePreview: (next: StageRect) => void;
	selectedId: string | null;
	issues: Map<string, SectionIssues>;
	readOnly: boolean;
	grid: boolean;
	snapOn: boolean;
	onGrid: (on: boolean) => void;
	onSnap: (on: boolean) => void;
	onSelect: (id: string | null) => void;
	/** A drag in progress (not an undo step yet) */
	onPreview: (id: string, x: number, y: number) => void;
	onDragEnd: () => void;
}

/**
 * The 1000 x 700 canvas of a venue layout. Sections are the buyer map's own `SectionSeats` / `StandingArea`, so what the
 * organizer edits is what buyers see. Drag a section to move it; drag the empty canvas to pan; pinch, Ctrl + wheel or the
 * buttons to zoom.
 */
const LayoutCanvas = ({ layout, focal, focalSelected, onSelectFocal, onStagePreview, selectedId, issues, readOnly, grid, snapOn, onGrid, onSnap, onSelect, onPreview, onDragEnd }: Props) => {
	const { t } = useTranslation(['organizer', 'checkout']);
	const [view, setView] = useState<View>(FIT);
	const svgRef = useRef<SVGSVGElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const pointers = useRef(new Map<number, { x: number; y: number }>());
	const gesture = useRef<{ pinch: number; moved: boolean; startX: number; startY: number }>({ pinch: 0, moved: false, startX: 0, startY: 0 });
	type Drag =
		| { kind: 'section'; id: string; pointerId: number; offX: number; offY: number; started: boolean }
		| { kind: 'stage'; pointerId: number; offX: number; offY: number; started: boolean }
		| { kind: 'resize'; handle: Handle; orig: StageRect; pointerId: number; started: boolean };
	const drag = useRef<Drag | null>(null);
	const [pxPerUnit, setPxPerUnit] = useState(1);
	const [coarse, setCoarse] = useState(false);

	const sections = useMemo(() => asLayoutSections(layout), [layout]);
	const tiers = useMemo(() => tierIndexes(sections), [sections]);
	const editableStage = focal.type === 'STAGE' && !readOnly;

	const viewBox = useMemo(() => {
		const w = FULL.w / view.zoom;
		const h = FULL.h / view.zoom;
		const cx = Math.min(FULL.x + FULL.w - w / 2, Math.max(FULL.x + w / 2, view.cx));
		const cy = Math.min(FULL.y + FULL.h - h / 2, Math.max(FULL.y + h / 2, view.cy));
		return { x: cx - w / 2, y: cy - h / 2, w, h };
	}, [view]);

	// Pixels per canvas unit, so the handles keep a fixed size on screen (and a 44 px target on touch screens)
	useEffect(() => {
		const element = wrapRef.current;
		if (!element) return undefined;
		const measure = () => setPxPerUnit(element.clientWidth / viewBox.w || 1);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => observer.disconnect();
	}, [viewBox.w]);
	useEffect(() => {
		const query = window.matchMedia('(pointer: coarse)');
		const update = () => setCoarse(query.matches);
		update();
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	}, []);

	const toSvg = useCallback((clientX: number, clientY: number) => {
		const svg = svgRef.current;
		const matrix = svg?.getScreenCTM();
		if (!svg || !matrix) return null;
		const point = svg.createSVGPoint();
		point.x = clientX;
		point.y = clientY;
		return point.matrixTransform(matrix.inverse());
	}, []);

	const zoomAt = useCallback((factor: number, point?: { x: number; y: number }) => {
		setView((current) => {
			const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * factor));
			if (!point) return { ...current, zoom };
			const ratio = current.zoom / zoom;
			return { zoom, cx: point.x - (point.x - current.cx) * ratio, cy: point.y - (point.y - current.cy) * ratio };
		});
	}, []);

	// Ctrl or Cmd + wheel (and the trackpad pinch, which browsers send the same way) zooms around the cursor; a plain wheel scrolls the page
	useEffect(() => {
		const element = wrapRef.current;
		if (!element) return undefined;
		const onWheel = (event: WheelEvent) => {
			if (!event.ctrlKey && !event.metaKey) return;
			event.preventDefault();
			const point = toSvg(event.clientX, event.clientY);
			zoomAt(event.deltaY < 0 ? 1.15 : 1 / 1.15, point ?? undefined);
		};
		element.addEventListener('wheel', onWheel, { passive: false });
		return () => element.removeEventListener('wheel', onWheel);
	}, [toSvg, zoomAt]);

	// Keep a selected section in view when it is picked from the list (only when it is off screen)
	useEffect(() => {
		const section = layout.find((s) => s.id === selectedId);
		if (!section) return;
		const box = boundsOf(section);
		const inside = box.x >= viewBox.x && box.y >= viewBox.y && box.x + box.w <= viewBox.x + viewBox.w && box.y + box.h <= viewBox.y + viewBox.h;
		if (!inside) setView((current) => ({ ...current, cx: box.x + box.w / 2, cy: box.y + box.h / 2 }));
		// Only when the selection changes, not on every drag step
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedId]);

	const sectionAt = (target: EventTarget | null) => (target as Element | null)?.closest?.('[data-sec]')?.getAttribute('data-sec') ?? null;
	const focalAt = (target: EventTarget | null) => Boolean((target as Element | null)?.closest?.('[data-focal-hit]'));

	const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
		pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
		gesture.current = { pinch: 0, moved: false, startX: event.clientX, startY: event.clientY };
		if (pointers.current.size > 1) {
			// A second finger turns whatever was going on into a pinch
			if (drag.current?.started) onDragEnd();
			drag.current = null;
			return;
		}
		const handle = (event.target as Element | null)?.closest?.('[data-handle]')?.getAttribute('data-handle') as Handle | null | undefined;
		if (handle && editableStage) {
			drag.current = { kind: 'resize', handle, orig: { x: focal.x, y: focal.y, width: focal.width, height: focal.height }, pointerId: event.pointerId, started: false };
			svgRef.current?.setPointerCapture?.(event.pointerId);
			return;
		}
		const id = sectionAt(event.target);
		if (id) {
			onSelect(id);
			const section = layout.find((s) => s.id === id);
			const point = toSvg(event.clientX, event.clientY);
			if (section && point && !readOnly) {
				drag.current = { kind: 'section', id, pointerId: event.pointerId, offX: point.x - section.x, offY: point.y - section.y, started: false };
				svgRef.current?.setPointerCapture?.(event.pointerId);
			}
			return;
		}
		if (focalAt(event.target)) {
			onSelectFocal();
			const point = toSvg(event.clientX, event.clientY);
			// A pitch is selected (to read about it) but never dragged
			if (editableStage && point) {
				drag.current = { kind: 'stage', pointerId: event.pointerId, offX: point.x - focal.x, offY: point.y - focal.y, started: false };
				svgRef.current?.setPointerCapture?.(event.pointerId);
			}
		}
	};

	const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
		const known = pointers.current.get(event.pointerId);
		if (!known) return;
		const previous = { ...known };
		pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
		const svg = svgRef.current;
		const matrix = svg?.getScreenCTM();
		if (!svg || !matrix) return;
		const all = Array.from(pointers.current.values());

		if (all.length >= 2) {
			const [a, b] = all;
			const distance = Math.hypot(a.x - b.x, a.y - b.y);
			if (gesture.current.pinch) zoomAt(distance / gesture.current.pinch, toSvg((a.x + b.x) / 2, (a.y + b.y) / 2) ?? undefined);
			gesture.current.pinch = distance;
			gesture.current.moved = true;
			return;
		}

		const travelled = Math.hypot(event.clientX - gesture.current.startX, event.clientY - gesture.current.startY);
		if (!gesture.current.moved && travelled < 4) return;
		gesture.current.moved = true;

		const current = drag.current;
		if (current && current.pointerId === event.pointerId && current.kind === 'resize') {
			const point = toSvg(event.clientX, event.clientY);
			if (!point) return;
			current.started = true;
			onStagePreview(resizeStage(current.orig, current.handle, snap(point.x, snapOn), snap(point.y, snapOn)));
			return;
		}
		if (current && current.pointerId === event.pointerId && current.kind === 'stage') {
			const point = toSvg(event.clientX, event.clientY);
			if (!point) return;
			current.started = true;
			onStagePreview({ x: snap(point.x - current.offX, snapOn), y: snap(point.y - current.offY, snapOn), width: focal.width, height: focal.height });
			return;
		}
		if (current && current.pointerId === event.pointerId && current.kind === 'section') {
			const section = layout.find((s) => s.id === current.id);
			const point = toSvg(event.clientX, event.clientY);
			if (!section || !point) return;
			current.started = true;
			const target = clampToCanvas(section, snap(point.x - current.offX, snapOn), snap(point.y - current.offY, snapOn));
			// A legacy section wider than the canvas is only moved by hand to somewhere on it
			if (target.x !== section.x || target.y !== section.y) onPreview(section.id, target.x, target.y);
			return;
		}
		svg.setPointerCapture?.(event.pointerId);
		setView((v) => ({ ...v, cx: v.cx - (event.clientX - previous.x) / matrix.a, cy: v.cy - (event.clientY - previous.y) / matrix.d }));
	};

	const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
		pointers.current.delete(event.pointerId);
		gesture.current.pinch = 0;
		if (drag.current?.pointerId === event.pointerId) {
			if (drag.current.started) onDragEnd();
			drag.current = null;
		}
		if (!gesture.current.moved && !sectionAt(event.target) && !focalAt(event.target) && pointers.current.size === 0) onSelect(null);
	};

	const selected = layout.find((s) => s.id === selectedId);

	return (
		<div className="seatmap lc">
			<div className="seatmap__toolbar lc__toolbar">
				<button type="button" className="seatmap__btn" onClick={() => zoomAt(1 / 1.4)} aria-label={t('checkout:map.zoomOut')} disabled={view.zoom <= MIN_ZOOM}>
					<MagnifyingGlassMinus size={20} />
				</button>
				<span className="seatmap__zoom" aria-live="off">
					{Math.round(view.zoom * 100)}%
				</span>
				<button type="button" className="seatmap__btn" onClick={() => zoomAt(1.4)} aria-label={t('checkout:map.zoomIn')} disabled={view.zoom >= MAX_ZOOM}>
					<MagnifyingGlassPlus size={20} />
				</button>
				<button type="button" className="seatmap__fit" onClick={() => setView(FIT)}>
					<ArrowsOut size={18} aria-hidden="true" /> {t('checkout:map.fit')}
				</button>
				<span className="lc__spacer" />
				<button type="button" className={`lc__toggle ${grid ? 'is-on' : ''}`} aria-pressed={grid} onClick={() => onGrid(!grid)}>
					<GridFour size={18} aria-hidden="true" /> {t('organizer:venues.canvas.grid')}
				</button>
				<button type="button" className={`lc__toggle ${snapOn ? 'is-on' : ''}`} aria-pressed={snapOn} onClick={() => onSnap(!snapOn)}>
					<Magnet size={18} aria-hidden="true" /> {t('organizer:venues.canvas.snap', { size: GRID })}
				</button>
			</div>
			<div className="seatmap__wrap lc__wrap" ref={wrapRef} style={{ aspectRatio: `${FULL.w} / ${FULL.h}` }}>
				<svg
					ref={svgRef}
					className="seatmap__svg lc__svg"
					viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
					role="img"
					aria-label={t('organizer:venues.canvas.label', { size: `${CANVAS.w} × ${CANVAS.h}` })}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerCancel={onPointerUp}
				>
					<defs>
						<pattern id="lc-grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
							<circle cx={GRID / 2} cy={GRID / 2} r={0.7} className="lc__dot" />
						</pattern>
					</defs>
					<rect className="lc__sheet" x={0} y={0} width={CANVAS.w} height={CANVAS.h} />
					{grid && <rect x={0} y={0} width={CANVAS.w} height={CANVAS.h} fill="url(#lc-grid)" pointerEvents="none" />}
					<rect className="lc__edge" x={0} y={0} width={CANVAS.w} height={CANVAS.h} pointerEvents="none" />
					<FocalShape focal={focal} stageLabel={t('checkout:map.stage')} pitchLabel={t('checkout:map.pitch')} />
					<rect
						className={`lc__focal ${focal.type === 'STAGE' && editableStage ? 'is-movable' : ''} ${focalSelected ? 'is-selected' : ''}`}
						data-focal-hit
						x={focal.x}
						y={focal.y}
						width={focal.width}
						height={focal.height}
						rx={focal.type === 'STAGE' ? Math.min(11, focal.height / 2) : 6}
					/>
					{layout.map((section) => {
						const mapSection = layoutSectionOf(section);
						const problems = issues.get(section.id);
						const box = sectionBounds(mapSection);
						return (
							<g
								key={section.id}
								data-sec={section.id}
								className={`lc__sec ${section.id === selectedId ? 'is-selected' : ''} ${problems?.errors.length ? 'has-error' : problems?.warnings.length ? 'has-warning' : ''}`}
							>
								{section.kind === 'STANDING' ? (
									<StandingArea section={mapSection} label={t('checkout:map.standing')} sub={t('checkout:map.standingNote')} />
								) : (
									<SectionSeats
										section={mapSection}
										color={tierColor(tiers.get(section.tierKey))}
										taken={NONE_TAKEN}
										selected={NONE_SELECTED}
										locked={false}
										active={false}
										showRows={false}
									/>
								)}
								{section.kind === 'SEATED' && (
									<text className="seatmap__name" x={section.x} y={box.y - 7} textAnchor="middle" pointerEvents="none">
										{mapSection.name}
									</text>
								)}
							</g>
						);
					})}
					{selected && <SelectionFrame section={selected} bad={Boolean(issues.get(selected.id)?.errors.length)} />}
					{focalSelected && editableStage && (
						<g className="lc__handles">
							{HANDLES.map((handle) => {
								const at = handlePoint(focal, handle);
								const size = 10 / pxPerUnit;
								// 44 px target on a touch screen, 28 px with a mouse
								const reach = (coarse ? 22 : 14) / pxPerUnit;
								return (
									<g key={handle} data-handle={handle} className={`lc__handle lc__handle--${handle}`}>
										<circle className="lc__handle-hit" cx={at.x} cy={at.y} r={reach} />
										<rect className="lc__handle-dot" x={at.x - size / 2} y={at.y - size / 2} width={size} height={size} rx={size * 0.2} pointerEvents="none" />
									</g>
								);
							})}
						</g>
					)}
				</svg>
			</div>
		</div>
	);
};

/** A frame around the selected section; it turns with the section. */
const SelectionFrame = ({ section, bad }: { section: DraftSection; bad: boolean }) => {
	const { w, h } = sizeOf(section);
	const pad = 10;
	const rotation = Number.isFinite(section.rotation) ? section.rotation : 0;
	return (
		<g className={`lc__frame ${bad ? 'is-bad' : ''}`} pointerEvents="none" transform={`translate(${section.x} ${section.y}) rotate(${rotation})`}>
			<rect x={-w / 2 - pad} y={-h / 2 - pad} width={w + pad * 2} height={h + pad * 2} rx={10} />
		</g>
	);
};

export default LayoutCanvas;
