import { Html, Head, Main, NextScript } from 'next/document';

// Runs before first paint so the saved theme never flashes. Dark is the default (tokens.css).
// The browser bar colour follows the chosen theme, not the system one, because the app theme is the user's own choice.
const themeScript = `try{var t=localStorage.getItem('ticketzy-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);document.querySelectorAll('meta[name=theme-color]').forEach(function(m){m.setAttribute('content',t==='light'?'#f6f6f3':'#0a0b0d')})}}catch(e){}`;

// <html lang> is set by Next from the page locale (i18n is on); a fixed lang here would override it.
export default function Document() {
	return (
		<Html>
			<Head>
				<link rel="icon" href="/favicon.ico" sizes="48x48" />
				<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
				<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
				<link rel="manifest" href="/site.webmanifest" />
				<meta name="theme-color" content="#0a0b0d" media="(prefers-color-scheme: dark)" />
				<meta name="theme-color" content="#f6f6f3" media="(prefers-color-scheme: light)" />
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
