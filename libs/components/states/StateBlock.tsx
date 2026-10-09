import { ReactNode } from 'react';

interface Props {
	icon: ReactNode;
	title: string;
	text?: string;
	/** between the text and the actions (e.g. a status banner) */
	extra?: ReactNode;
	actions?: ReactNode;
	/** Error states are announced to screen readers. */
	alert?: boolean;
	/** Heading level: `h1` when the block is the whole content of the page */
	as?: 'h1' | 'h2';
}

/** Empty / no-results / error panel (design: EmptyState). One icon tile, a title, one sentence, one or two actions. */
const StateBlock = ({ icon, title, text, extra, actions, alert, as: Heading = 'h2' }: Props) => (
	<div className="tz-empty" role={alert ? 'alert' : undefined}>
		<span className="tz-empty__art" aria-hidden="true">
			{icon}
		</span>
		<Heading className="tz-empty__title">{title}</Heading>
		{text && <p className="tz-empty__text">{text}</p>}
		{extra}
		{actions && <div className="tz-empty__actions">{actions}</div>}
	</div>
);

export default StateBlock;
