import Head from 'next/head';

/**
 * Pages opened from an emailed link do not tell other sites where the visitor came from. The same policy is also sent as
 * a response header for these routes (next.config.js), which covers the very first request.
 */
const NoReferrer = () => (
	<Head>
		<meta key="referrer" name="referrer" content="no-referrer" />
	</Head>
);

export default NoReferrer;
