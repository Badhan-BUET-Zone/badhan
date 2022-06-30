// material-ui
import Box from '@mui/material/Box';
import badhanLogo from '../../src/assets/images/badhanlogo.png'
import styles from './Logo.module.css'

const Logo = () => {
    return (
        <Box
            component="img"
            className={styles.logoBox}
            alt="Logo"
            src={badhanLogo}
        />
    );
};

export default Logo;
