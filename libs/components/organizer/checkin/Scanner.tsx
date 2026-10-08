import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { Camera, CameraSlash, CameraRotate } from 'phosphor-react';

type Phase = 'idle' | 'starting' | 'running' | 'denied' | 'unavailable';

interface Props {
	/** raw QR text; the page decides what it means */
	onScan: (text: string) => void;
	disabled?: boolean;
}

const REGION = 'org-scan-region';

/**
 * Camera scanner (html5-qrcode, loaded only in the browser when the organizer turns it on: the camera needs a click and a secure page).
 * The library keeps decoding the same frame, so the page ignores repeats. Switch camera cycles through the cameras found.
 */
const Scanner = ({ onScan, disabled }: Props) => {
	const { t } = useTranslation('organizer');
	const [phase, setPhase] = useState<Phase>('idle');
	const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
	const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
	const indexRef = useRef(-1);
	const onScanRef = useRef(onScan);
	onScanRef.current = onScan;

	const stop = useCallback(async () => {
		const scanner = scannerRef.current;
		scannerRef.current = null;
		if (!scanner) return;
		try {
			if (scanner.isScanning) await scanner.stop();
			scanner.clear();
		} catch {
			// already stopped
		}
	}, []);

	const start = useCallback(
		async (index?: number) => {
			setPhase('starting');
			await stop();
			try {
				const { Html5Qrcode } = await import('html5-qrcode');
				let list = cameras;
				if (!list.length) {
					list = (await Html5Qrcode.getCameras()).map((c) => ({ id: c.id, label: c.label }));
					setCameras(list);
				}
				if (!list.length) {
					setPhase('unavailable');
					return;
				}
				const scanner = new Html5Qrcode(REGION, { verbose: false });
				scannerRef.current = scanner;
				// first start prefers the back camera; after that the organizer chooses by cycling
				const config = { fps: 10, qrbox: (w: number, h: number) => ({ width: Math.floor(Math.min(w, h) * 0.8), height: Math.floor(Math.min(w, h) * 0.8) }) };
				const source = index === undefined ? { facingMode: 'environment' } : list[index % list.length].id;
				if (index !== undefined) indexRef.current = index % list.length;
				await scanner.start(source, config, (text) => onScanRef.current(text), () => undefined);
				setPhase('running');
			} catch (err) {
				scannerRef.current = null;
				const name = err instanceof Error ? err.name : String(err);
				setPhase(/NotAllowed|Permission|denied/i.test(`${name} ${String(err)}`) ? 'denied' : 'unavailable');
			}
		},
		[cameras, stop],
	);

	useEffect(() => {
		return () => {
			void stop();
		};
	}, [stop]);

	const running = phase === 'running';

	return (
		<div className="org-scan">
			<div className={`org-scan__view${running ? ' is-on' : ''}`}>
				<div id={REGION} className="org-scan__region" />
				{!running && (
					<div className="org-scan__idle">
						{phase === 'denied' || phase === 'unavailable' ? <CameraSlash size={32} aria-hidden="true" /> : <Camera size={32} aria-hidden="true" />}
						<p role={phase === 'denied' || phase === 'unavailable' ? 'alert' : undefined}>
							{phase === 'denied' ? t('checkin.camera.denied') : phase === 'unavailable' ? t('checkin.camera.unavailable') : phase === 'starting' ? t('checkin.camera.starting') : t('checkin.camera.hint')}
						</p>
					</div>
				)}
			</div>
			<div className="org-scan__actions">
				{running ? (
					<>
						<Button variant="outlined" startIcon={<CameraRotate size={20} aria-hidden="true" />} disabled={cameras.length < 2} onClick={() => start(indexRef.current + 1)}>
							{t('checkin.camera.switch')}
						</Button>
						<Button
							variant="outlined"
							onClick={async () => {
								await stop();
								setPhase('idle');
							}}
						>
							{t('checkin.camera.stop')}
						</Button>
					</>
				) : (
					<Button variant="contained" startIcon={<Camera size={20} aria-hidden="true" />} disabled={disabled || phase === 'starting'} onClick={() => start()}>
						{phase === 'denied' || phase === 'unavailable' ? t('checkin.camera.retry') : t('checkin.camera.start')}
					</Button>
				)}
			</div>
		</div>
	);
};

export default Scanner;
