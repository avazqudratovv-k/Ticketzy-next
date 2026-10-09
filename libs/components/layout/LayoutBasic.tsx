import React from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useTranslation } from 'next-i18next';
import Top from '../Top';
import Footer from '../Footer';
import PendingBanner from '../common/PendingBanner';
import WakeNote from '../common/WakeNote';

// The chat panel is not needed for the first paint; it loads after hydration
const AssistantWidget = dynamic(() => import('../assistant/AssistantWidget'), { ssr: false });

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
						<WakeNote contained />
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
