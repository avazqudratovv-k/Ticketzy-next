import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Dialog, useMediaQuery } from '@mui/material';
import { X } from 'phosphor-react';
import { FocalArea, LayoutSection, SeatRef, TakenSeat } from '../../seats/types';
import type { SeatViewHandle } from './seatViewScene';

interface Props {
	seat: SeatRef;
	seatText: string;
	sections: LayoutSection[];
	focalArea?: Partial<FocalArea> | null;
	taken: Map<string, TakenSeat>;
	selected: Set<string>;
	onClose: () => void;
}

/** "View from your seat" (F391): an approximate 3D view from one seat. Loaded only when opened; `three` loads inside the effect. */
const SeatViewDialog = ({ seat, seatText, sections, focalArea, taken, selected, onClose }: Props) => {
	const { t } = useTranslation('checkout');
	const full = useMediaQuery('(max-width: 599px)');
	const [stage, setStage] = useState<HTMLDivElement | null>(null);
	const [state, setState] = useState<'loading' | 'ready' | 'unsupported'>('loading');
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
				setState(handle ? 'ready' : 'unsupported');
			})
			.catch(() => !cancelled && setState('unsupported'));
		return () => {
			cancelled = true;
			handle?.dispose();
		};
	}, [stage]);

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
					<p className="seatview__seat">{seatText}</p>
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
			<footer className="seatview__foot">
				<p>{t('view.label')}</p>
				<p className="seatview__hint">{t('view.hint')}</p>
			</footer>
		</Dialog>
	);
};

export default SeatViewDialog;
