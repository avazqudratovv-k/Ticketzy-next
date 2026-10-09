import React from 'react';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import Top from '../Top';
import Footer from '../Footer';
import PendingBanner from '../common/PendingBanner';
import AssistantWidget from '../assistant/AssistantWidget';

/** Public layout: navbar, content column, footer, and the assistant button (public and buyer pages; the dashboards have their own shell). */
const withLayoutBasic = (Component: any) => {
	const WithLayoutBasic = (props: any) => {
		const { t } = useTranslation('common');

		return (
			<>
				<Head>
					<title>Ticketzy</title>
					<meta name={'title'} content={'Ticketzy'} />
				</Head>
				<div className="tz-app">
					<a className="tz-skip" href="#main">
						{t('skipToContent')}
					</a>
					<Top />
					<PendingBanner />
					<main id="main">
						<Component {...props} />
					</main>
					<Footer />
					<AssistantWidget />
				</div>
			</>
		);
	};
	return WithLayoutBasic;
};

export default withLayoutBasic;
