import { useSelector } from 'react-redux';

import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, StyledEngineProvider } from '@mui/material';

import {CustomizationModel} from "./store/customizationModel";

// routing
import Routes from './routes';

// defaultTheme
import themes from './themes';

// project imports
import NavigationScroll from './layout/NavigationScroll';
import {NotificationSnackbar} from "./layout/NotificationSnackbar";
import ErrorBoundary from "./ErrorBoundary";

// ==============================|| APP ||============================== //

const App = () => {
    const customization = useSelector((state: { customization: CustomizationModel}) => {
        return state.customization
    });

    return (
        <ErrorBoundary>
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={themes(customization)}>
                    <CssBaseline />
                    <NavigationScroll>
                        <Routes />
                        <NotificationSnackbar/>
                    </NavigationScroll>
                </ThemeProvider>
            </StyledEngineProvider>
        </ErrorBoundary>
    );
};

export default App;
