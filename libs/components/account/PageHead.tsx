import { ReactNode } from 'react';

/** Title, one sentence and optional actions at the top of an account page. */
const PageHead = ({ title, text, actions }: { title: string; text?: ReactNode; actions?: ReactNode }) => (
	<div className="acct__head">
		<div>
			<h1 className="acct__title">{title}</h1>
			{text && <p className="acct__sub">{text}</p>}
		</div>
		{actions && <div className="acct__head-actions">{actions}</div>}
	</div>
);

export default PageHead;
