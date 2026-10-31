import { useCallback } from 'react';
import { useRouter } from 'next/router';
import { userVar } from '../apollo/store';
import { syncMemberLang } from './auth/emailAuth';

export const LOCALE_STORAGE_KEY = 'locale';

/** Each language is written in its own script and never translated (design: LanguageSwitcher). */
export const LANGUAGES = [
	{ code: 'en', label: 'English' },
	{ code: 'ko', label: '한국어' },
	{ code: 'ru', label: 'Русский' },
	{ code: 'uz', label: 'Oʻzbekcha' },
] as const;

export type LocaleCode = (typeof LANGUAGES)[number]['code'];

export const isLocale = (value: string | null | undefined): value is LocaleCode =>
	LANGUAGES.some((language) => language.code === value);

export const languageLabel = (code: string) => LANGUAGES.find((language) => language.code === code)?.label ?? code;

/** Switches the interface language on the same page, remembers the choice and, for a signed-in member, keeps `memberLang` in step. */
export function useChangeLanguage() {
	const router = useRouter();
	return useCallback(
		(code: LocaleCode) => {
			try {
				localStorage.setItem(LOCALE_STORAGE_KEY, code);
			} catch {
				// the choice then lasts for this visit only
			}
			// A signed-in member's emails follow the language they chose; the switch does not wait for it
			if (userVar()) void syncMemberLang(code);
			return router.push({ pathname: router.pathname, query: router.query }, router.asPath, {
				locale: code,
				scroll: false,
			});
		},
		[router],
	);
}

const pathOnly = (url: string) => url.split(/[?#]/)[0].replace(/\/$/, '') || '/';
const withoutLocale = (path: string) => pathOnly(path).replace(/^\/(en|ko|ru|uz)(?=\/|$)/, '') || '/';

/** True when `url` is the page the buyer is already on, only in another language (a language switch is not leaving, F374). */
export const isSamePageOtherLocale = (url: string, currentAsPath: string) =>
	withoutLocale(url) === withoutLocale(currentAsPath);
