import React from 'react';
import { withRouter, NextRouter } from 'next/router';
import Brand from './Brand';
import ErrorScreen from '../states/ErrorScreen';

interface Props {
	router: NextRouter;
	children: React.ReactNode;
}

interface State {
	failedAt: string | null;
}

/** Catches render errors anywhere under the app shell and shows a friendly retry screen instead of a blank page. A navigation clears it. */
class AppErrorBoundary extends React.Component<Props, State> {
	state: State = { failedAt: null };

	static getDerivedStateFromError(): Partial<State> {
		return { failedAt: '' };
	}

	componentDidCatch(error: unknown) {
		this.setState({ failedAt: this.props.router.asPath });
		console.error('Ticketzy render error', error);
	}

	componentDidUpdate() {
		const { failedAt } = this.state;
		// leaving the page that failed gives the next page a clean start
		if (failedAt && failedAt !== this.props.router.asPath) this.setState({ failedAt: null });
	}

	render() {
		if (this.state.failedAt === null) return this.props.children;
		return (
			<>
				<header className="tz-container" style={{ paddingBlock: 'var(--space-4)' }}>
					<Brand />
				</header>
				<main id="main">
					<ErrorScreen kind="server" onRetry={() => this.setState({ failedAt: null })} />
				</main>
			</>
		);
	}
}

export default withRouter(AppErrorBoundary);
