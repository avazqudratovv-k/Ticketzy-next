import type { AppProps } from 'next/app';
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Onest, Noto_Sans_KR, JetBrains_Mono } from 'next/font/google';
import { ApolloProvider } from '@apollo/client';
import { appWithTranslation } from 'next-i18next';
import { useApollo } from '../apollo/client';
import { restoreSession } from '../libs/auth';
import { TOKEN_STORAGE_KEY } from '../libs/auth/token';
import { ThemeModeProvider } from '../libs/theme/ThemeModeProvider';
import { isLocale, LOCALE_STORAGE_KEY } from '../libs/i18n';
import '../scss/tokens.css';
import '../scss/app.scss';
import '../scss/layout.scss';
import '../scss/auth.scss';
import '../scss/home.scss';
import '../scss/events.scss';
import '../scss/seats.scss';

// Latin and Cyrillic from Onest (Uzbek needs latin-ext for oʻ and gʻ), Hangul from Noto Sans KR, codes in JetBrains Mono.
const onest = Onest({ subsets: ['latin', 'latin-ext', 'cyrillic'], display: 'swap' });
const notoSansKr = Noto_Sans_KR({ subsets: ['latin'], display: 'swap', preload: false });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin', 'cyrillic'], display: 'swap' });

const App = ({ Component, pageProps }: AppProps) => {
	const client = useApollo(pageProps.initialApolloState);
	const router = useRouter();

	/** LIFECYCLES **/
	// Restore the session once, and again when another tab signs in or out.
	useEffect(() => {
		restoreSession();
		const onStorage = (event: StorageEvent) => {
			if (event.key === TOKEN_STORAGE_KEY) restoreSession();
		};
		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	}, []);

	// A saved language choice wins over the URL on the first load (locale detection is off).
	useEffect(() => {
		let saved: string | null = null;
		try {
			saved = localStorage.getItem(LOCALE_STORAGE_KEY);
		} catch {
			return;
		}
		if (isLocale(saved) && saved !== router.locale) {
			router.replace({ pathname: router.pathname, query: router.query }, router.asPath, { locale: saved });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<>
			<style jsx global>{`
				:root {
					--font-onest: ${onest.style.fontFamily};
					--font-noto-kr: ${notoSansKr.style.fontFamily};
					--font-jetbrains: ${jetbrainsMono.style.fontFamily};
				}
			`}</style>
			<ApolloProvider client={client}>
				<ThemeModeProvider>
					<Component {...pageProps} />
				</ThemeModeProvider>
			</ApolloProvider>
		</>
	);
};

export default appWithTranslation(App);
