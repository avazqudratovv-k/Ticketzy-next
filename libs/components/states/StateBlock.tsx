import { ReactNode } from 'react';

interface Props {
	icon: ReactNode;
	title: string;
	text?: string;
	actions?: ReactNode;
	/** Error states are announced to screen readers. */
	alert?: boolean;
}

/** Empty / no-results / error panel (design: EmptyState). One icon tile, a title, one sentence, one or two actions. */
const StateBlock = ({ icon, title, text, actions, alert }: Props) => (
	<div className="tz-empty" role={alert ? 'alert' : undefined}>
		<span className="tz-empty__art" aria-hidden="true">
			{icon}
		</span>
		<h2 className="tz-empty__title">{title}</h2>
		{text && <p className="tz-empty__text">{text}</p>}
		{actions && <div className="tz-empty__actions">{actions}</div>}
	</div>
);

export default StateBlock;
