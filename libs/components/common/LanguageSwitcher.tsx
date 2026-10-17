import React, { useState } from 'react';
import { Menu, MenuItem } from '@mui/material';
import { Check, Globe } from 'phosphor-react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { LANGUAGES, languageLabel, LocaleCode, useChangeLanguage } from '../../i18n';

/** Compact globe + code with a menu (navbar, top bar), or the segmented form (footer). */
const LanguageSwitcher = ({ variant = 'menu', labelledBy }: { variant?: 'menu' | 'segmented'; labelledBy?: string }) => {
	const { t } = useTranslation('common');
	const { locale = 'en' } = useRouter();
	const changeLanguage = useChangeLanguage();
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);

	if (variant === 'segmented') {
		return (
			<div className="tz-lang--segmented" role="radiogroup" aria-label={labelledBy ? undefined : t('header.languageLabel')} aria-labelledby={labelledBy}>
				{LANGUAGES.map(({ code, label }) => (
					<button
						key={code}
						type="button"
						role="radio"
						lang={code}
						aria-checked={code === locale}
						className="tz-lang__segment"
						onClick={() => changeLanguage(code)}
					>
						{label}
					</button>
				))}
			</div>
		);
	}

	const select = (code: LocaleCode) => {
		setAnchor(null);
		if (code !== locale) changeLanguage(code);
	};

	return (
		<>
			<button
				type="button"
				className="tz-lang__trigger"
				aria-haspopup="listbox"
				aria-expanded={Boolean(anchor)}
				aria-label={t('header.language', { name: languageLabel(locale) })}
				onClick={(event) => setAnchor(event.currentTarget)}
			>
				<Globe size={20} aria-hidden="true" />
				<span className="tz-lang__code">{locale.toUpperCase()}</span>
			</button>
			<Menu
				anchorEl={anchor}
				open={Boolean(anchor)}
				onClose={() => setAnchor(null)}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
				transformOrigin={{ vertical: 'top', horizontal: 'right' }}
				MenuListProps={{ role: 'listbox', 'aria-label': t('header.languageLabel') }}
			>
				{LANGUAGES.map(({ code, label }) => (
					<MenuItem key={code} role="option" lang={code} selected={code === locale} onClick={() => select(code)}>
						{label}
						{code === locale ? (
							<Check size={18} style={{ marginInlineStart: 'auto', color: 'var(--accent-text)' }} />
						) : (
							<span className="tz-lang__meta">{code.toUpperCase()}</span>
						)}
					</MenuItem>
				))}
			</Menu>
		</>
	);
};

export default LanguageSwitcher;
