import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Dialog, useMediaQuery } from '@mui/material';
import { ArrowCounterClockwise, CaretLeft, CaretRight, Eye, X } from 'phosphor-react';
import { FocalArea, LayoutSection, SeatRef, TakenSeat } from '../../seats/types';
import type { SeatViewHandle } from './seatViewScene';

interface Props {
	seat: SeatRef;
	seatText: (ref: SeatRef) => string;
	sections: LayoutSection[];
	focalArea?: Partial<FocalArea> | null;
	taken: Map<string, TakenSeat>;
	selected: Set<string>;
	onClose: () => void;
}

const parseKey = (key: string): SeatRef => {
	const parts = key.split(':');
	const number = Number(parts.pop());
	const row = Number(parts.pop());
	return { sectionKey: parts.join(':'), row, number };
};
const sameSeat = (a: SeatRef, b: SeatRef) => a.sectionKey === b.sectionKey && a.row === b.row && a.number === b.number;

/** "View from your seat" (F391): an approximate 3D view from one seat. Loaded only when opened; `three` loads inside the effect. */
const SeatViewDialog = ({ seat, seatText, sections, focalArea, taken, selected, onClose }: Props) => {
	const { t } = useTranslation('checkout');
	const full = useMediaQuery('(max-width: 599px)');
	const [stage, setStage] = useState<HTMLDivElement | null>(null);
	const [state, setState] = useState<'loading' | 'ready' | 'unsupported'>('loading');
	const handleRef = useRef<SeatViewHandle | null>(null);
	// The seat the camera sits in; the buyer can step through the seats picked so far (F401)
	const [current, setCurrent] = useState<SeatRef>(seat);
	const [mode, setMode] = useState<'seat' | 'overview'>('seat');
	const seats = useMemo(() => {
		const list = [...selected].map(parseKey);
		return list.some((item) => sameSeat(item, seat)) ? list : [seat, ...list];
	}, [selected, seat]);
	const position = Math.max(0, seats.findIndex((item) => sameSeat(item, current)));
	const go = (step: number) => setCurrent(seats[(position + step + seats.length) % seats.length]);
	// The scene is built once per opening; later selection changes do not rebuild it
	const input = useRef({ sections, focalArea, taken, selected, seat, label: t('view.canvasLabel') });

	useEffect(() => {
		if (!stage) return undefined;
		let handle: SeatViewHandle | null = null;
		let cancelled = false;
		import('./seatViewScene')
			.then(({ createSeatView }) => {
				if (cancelled) return;
				handle = createSeatView(stage, input.current);
				handleRef.current = handle;
				setState(handle ? 'ready' : 'unsupported');
			})
			.catch(() => !cancelled && setState('unsupported'));
		return () => {
			cancelled = true;
			handleRef.current = null;
			handle?.dispose();
		};
	}, [stage]);

	useEffect(() => {
		handleRef.current?.setSeat(current);
	}, [current, state]);

	useEffect(() => {
		handleRef.current?.setMode(mode);
	}, [mode, state]);

	return (
		<Dialog
			open
			onClose={onClose}
			fullScreen={full}
			fullWidth
			maxWidth="lg"
			aria-labelledby="seatview-title"
			PaperProps={{ className: 'seatview' }}
		>
			<header className="seatview__head">
				<div>
					<h2 id="seatview-title" className="seatview__title">
						{t('view.title')}
					</h2>
					<p className="seatview__seat" aria-live="polite">
						{seatText(current)}
					</p>
				</div>
				<button type="button" className="seatview__close" onClick={onClose} aria-label={t('view.close')}>
					<X size={22} aria-hidden="true" />
				</button>
			</header>
			<div className="seatview__stage" ref={setStage} data-state={state}>
				{state === 'loading' && <p className="seatview__msg">{t('view.loading')}</p>}
				{state === 'unsupported' && (
					<p className="seatview__msg" role="status">
						{t('view.unsupported')}
					</p>
				)}
			</div>
			{state === 'ready' && (
				<div className="seatview__bar">
					{seats.length > 1 && (
						<div className="seatview__pager" role="group" aria-label={t('view.seats')}>
							<button type="button" className="seatview__tool" onClick={() => go(-1)} aria-label={t('view.prev')}>
								<CaretLeft size={20} aria-hidden="true" />
							</button>
							<span className="seatview__count">{t('view.count', { index: position + 1, total: seats.length })}</span>
							<button type="button" className="seatview__tool" onClick={() => go(1)} aria-label={t('view.next')}>
								<CaretRight size={20} aria-hidden="true" />
							</button>
						</div>
					)}
					<button type="button" className="seatview__tool seatview__tool--text" aria-pressed={mode === 'overview'} onClick={() => setMode(mode === 'seat' ? 'overview' : 'seat')}>
						<Eye size={18} aria-hidden="true" />
						{mode === 'seat' ? t('view.overview') : t('view.fromSeat')}
					</button>
					<button type="button" className="seatview__tool seatview__tool--text" onClick={() => handleRef.current?.resetView()}>
						<ArrowCounterClockwise size={18} aria-hidden="true" />
						{t('view.reset')}
					</button>
				</div>
			)}
			<footer className="seatview__foot">
				<p>{t('view.label')}</p>
				<p className="seatview__hint">{t(mode === 'seat' ? 'view.hint' : 'view.hintOverview')}</p>
			</footer>
		</Dialog>
	);
};

export default SeatViewDialog;
