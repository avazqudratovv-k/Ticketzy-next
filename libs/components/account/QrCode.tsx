import { useEffect, useState } from 'react';

/**
 * Draws the QR code of the token the backend returned. The token is never made or signed here.
 * Always black on white with a quiet zone, whatever the theme: scanners need the contrast.
 */
const QrCode = ({ value, label, className }: { value: string; label: string; className?: string }) => {
	const [src, setSrc] = useState<string | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setFailed(false);
		// the generator is loaded on first use, not with the page
		import('qrcode')
			.then((QRCode) => QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 2, width: 640, color: { dark: '#000000', light: '#ffffff' } }))
			.then((url) => !cancelled && setSrc(url))
			.catch(() => !cancelled && setFailed(true));
		return () => {
			cancelled = true;
		};
	}, [value]);

	if (failed) return <p className="qr__fail" role="alert">{label}</p>;
	if (!src) return <span className={`qr qr--loading ${className ?? ''}`} aria-hidden="true" />;
	// eslint-disable-next-line @next/next/no-img-element
	return <img className={`qr ${className ?? ''}`} src={src} alt={label} width={320} height={320} />;
};

export default QrCode;
