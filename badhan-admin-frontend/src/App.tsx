import {useDispatch, useSelector} from 'react-redux';

import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, StyledEngineProvider } from '@mui/material';
import { AnimatePresence } from "framer-motion"

import {CustomizationModel} from "./store/customizationModel";

// routing
import Routes from './routes';

// defaultTheme
import themes from './themes';

// project imports
import NavigationScroll from './layout/NavigationScroll';
import {NotificationSnackbar} from "./layout/NotificationSnackbar";
import ErrorBoundary from "./ErrorBoundary";
import {useEffect} from "react";
import {UserProfileLogin, UserProfileLogout} from "./store/userProfileModel";

// ==============================|| APP ||============================== //

const App = () => {
    const customization = useSelector((state: { customization: CustomizationModel}) => {
        return state.customization
    });

    const dispatch = useDispatch()

    useEffect(()=>{
        const token = localStorage.getItem('token')
        if(token){
            dispatch(new UserProfileLogin(token))
        }else {
            dispatch(new UserProfileLogout())
        }
    },[dispatch])

    return (
        <ErrorBoundary>
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={themes(customization)}>
                    <CssBaseline />
                    <NavigationScroll>
                        <AnimatePresence exitBeforeEnter>
                        <Routes />
                        </AnimatePresence>
                        <NotificationSnackbar/>
                    </NavigationScroll>
                </ThemeProvider>
            </StyledEngineProvider>
        </ErrorBoundary>
    );
};

export default App;
