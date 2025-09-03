import { Link } from 'react-router-dom';

// material-ui
import {ButtonBase, Typography} from '@mui/material';
import { Box} from '@mui/material';

// project imports
import config from '../../../config';
import Logo from '../../../ui-component/Logo';

// ==============================|| MAIN LOGO ||============================== //

const LogoSection = () => (
    <ButtonBase disableRipple component={Link} to={config.defaultPath}>
        <Logo />
        <Box>
            <Typography variant="h4">Badhan Admin</Typography>
        </Box>

    </ButtonBase>
);

export default LogoSection;
