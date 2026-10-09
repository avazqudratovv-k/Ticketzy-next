import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Flask, X } from 'phosphor-react';

const DISMISS_KEY = 'ticketzy-demo-notice';

/**
 * "Demo project: payments are simulated". The banner (checkout) can be dismissed and stays dismissed in this browser;
 * the footer line is always visible, so the statement can never be hidden everywhere.
 */
const DemoNotice = ({ variant = 'banner' }: { variant?: 'banner' | 'footer' }) => {
	const { t } = useTranslation('common');
	// null until local storage has been read, so a dismissed banner never flashes
	const [dismissed, setDismissed] = useState<boolean | null>(variant === 'footer' ? false : null);

	useEffect(() => {
		if (variant === 'footer') return;
		try {
			setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
		} catch {
			setDismissed(false);
		}
	}, [variant]);

	if (variant === 'footer') {
		return (
			<p className="demo-notice demo-notice--footer">
				<Flask size={16} aria-hidden="true" />
				<span>{t('demo.notice')}</span>
			</p>
		);
	}
	if (dismissed !== false) return null;

	const dismiss = () => {
		setDismissed(true);
		try {
			localStorage.setItem(DISMISS_KEY, '1');
		} catch {
			// the notice then only stays hidden until the page is reloaded
		}
	};

	return (
		<div className="demo-notice" role="note">
			<Flask size={20} aria-hidden="true" />
			<span className="demo-notice__text">{t('demo.notice')}</span>
			<button type="button" className="demo-notice__close" onClick={dismiss} aria-label={t('demo.dismiss')}>
				<X size={16} aria-hidden="true" />
			</button>
		</div>
	);
};

export default DemoNotice;
