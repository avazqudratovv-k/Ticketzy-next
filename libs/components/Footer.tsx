import { Stack, Box } from '@mui/material';

const Footer = () => {
	return (
		<Stack className={'footer-container'}>
			<Stack className={'main'}>
				<Stack className={'left'}>
					<Box component={'div'} className={'footer-box'}>
						<img src="/img/logo/logoWhite.svg" alt="" className={'logo'} />
					</Box>
				</Stack>
			</Stack>
			<Stack className={'second'}>
				<span>© Ticketzy - All rights reserved. {new Date().getFullYear()}</span>
			</Stack>
		</Stack>
	);
};

export default Footer;
