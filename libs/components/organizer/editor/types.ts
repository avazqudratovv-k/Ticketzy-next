import useEventEditor from '../../../organizer/useEventEditor';

export type Editor = ReturnType<typeof useEventEditor>;

/** What every step receives: the editor state and whether the form may be changed. */
export interface StepProps {
	editor: Editor;
	/** PENDING, CANCELLED and ENDED events are shown, not edited */
	readOnly: boolean;
}
