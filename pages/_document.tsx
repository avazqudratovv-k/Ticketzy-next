import { Html, Head, Main, NextScript } from 'next/document';

// Runs before first paint so the saved theme never flashes. Dark is the default (tokens.css).
const themeScript = `try{var t=localStorage.getItem('ticketzy-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function Document() {
	return (
		<Html lang="en">
			<Head>
				<meta name="robots" content="index,follow" />
				<link rel="icon" type="image/png" href="/img/logo/favicon.svg" />

				{/* SEO */}
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
