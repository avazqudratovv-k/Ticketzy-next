import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
	return (
		<Html lang="en">
			<Head>
				<meta name="robots" content="index,follow" />
				<link rel="icon" type="image/png" href="/img/logo/favicon.svg" />

				{/* SEO */}
				<meta name={'description'} content={'Ticketzy - discover events and buy tickets'} />
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
