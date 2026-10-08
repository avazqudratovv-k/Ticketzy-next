import React from 'react';
import Link from 'next/link';
import { List, ListItemButton, ListItemText } from '@mui/material';

/** Placeholder menu: Ticketzy admin pages are added in a later phase. **/
const AdminMenuList = () => {
	return (
		<List>
			<Link href={'/'}>
				<ListItemButton>
					<ListItemText primary={'Home'} />
				</ListItemButton>
			</Link>
		</List>
	);
};

export default AdminMenuList;
