import { ReactNode, useEffect, useRef } from 'react';
import { CircularProgress } from '@mui/material';

export type StatusTone = 'success' | 'danger' | 'info';

interface Props {
	tone: StatusTone;
	icon: ReactNode;
	title: string;
	text?: string;
	/** Notes, a button and links under the text */
	children?: ReactNode;
}

/** One result screen of the email pages (design: the pending layout). The heading takes focus when the screen appears, so the result is read out. */
const StatusScreen = ({ tone, icon, title, text, children }: Props) => {
	const heading = useRef<HTMLHeadingElement>(null);
	useEffect(() => {
		heading.current?.focus();
	}, []);
	return (
		<div className="pg-pending" role="status">
			<span className={`pg-pending__icon pg-pending__icon--${tone}`}>{icon}</span>
			<h1 ref={heading} tabIndex={-1}>
				{title}
			</h1>
			{text && <p>{text}</p>}
			{children}
		</div>
	);
};

export const WorkingScreen = ({ title }: { title: string }) => (
	<div className="pg-pending" role="status" aria-busy="true">
		<span className="pg-pending__icon pg-pending__icon--info">
			<CircularProgress size={28} color="inherit" aria-hidden="true" />
		</span>
		<h1>{title}</h1>
	</div>
);

export default StatusScreen;
