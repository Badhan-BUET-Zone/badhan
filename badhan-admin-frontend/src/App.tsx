import {useDispatch, useSelector} from 'react-redux';

import {ThemeProvider} from '@mui/material/styles';
import {CssBaseline, StyledEngineProvider} from '@mui/material';
import {AnimatePresence} from "framer-motion"

import {CustomizationModel} from "./store/customization/customizationModel";

// routing
import Routes from './routes';

// defaultTheme
import themes from './themes';

// project imports
import NavigationScroll from './layout/NavigationScroll';
import {NotificationSnackbar} from "./layout/NotificationSnackbar";
import ErrorBoundary from "./ErrorBoundary";
import {useEffect, useState} from "react";
import {UserProfileLogin, UserProfileLogout} from "./store/userProfile/userProfileModel";
import ConfirmationDialog from "./layout/ConfirmationDialog";
import WholePageLoader from "./layout/WholePageLoader";
import {handleGETUsersMe} from "./api";
import {NotificationError} from "./store/notification/notificationModel";

// ==============================|| APP ||============================== //

const App = () => {
    const customization = useSelector((state: { customization: CustomizationModel }) => {
        return state.customization
    });
    const [autoLoginLoader, setAutoLoginLoader] = useState<boolean>(true)

    const dispatch = useDispatch()

    const autoLogin = async () => {
        const token = localStorage.getItem('token')
        if (!token) {
            dispatch(new UserProfileLogout())
            setAutoLoginLoader((prevState => false))
            return
        }

        dispatch(new UserProfileLogin(token))
        const response = await handleGETUsersMe()
        setAutoLoginLoader((prevState => false))

        if (response.status !== 200) {
            dispatch(new NotificationError(response.data.message))
            dispatch(new UserProfileLogout())
            return
        }

    }

    useEffect(() => {
        autoLogin().then(r => {
        })
        // eslint-disable-next-line
    }, [])

    return (
        <ErrorBoundary>
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={themes(customization)}>
                    <CssBaseline/>
                    {autoLoginLoader && <WholePageLoader/>}
                    {!autoLoginLoader && <NavigationScroll>
                        <AnimatePresence exitBeforeEnter>
                            <Routes/>
                        </AnimatePresence>
                        <NotificationSnackbar/>
                        <ConfirmationDialog/>
                    </NavigationScroll>}
                </ThemeProvider>
            </StyledEngineProvider>
        </ErrorBoundary>
    );
};

export default App;
