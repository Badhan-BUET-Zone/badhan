import {useDispatch, useSelector} from 'react-redux';

import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, StyledEngineProvider } from '@mui/material';
import { AnimatePresence } from "framer-motion"

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
import {badhanAxios} from "./api";

// ==============================|| APP ||============================== //

const App = () => {
    const customization = useSelector((state: { customization: CustomizationModel}) => {
        return state.customization
    });
    const [autoLoginLoader, setAutoLoginLoader] = useState<boolean>(true)

    const dispatch = useDispatch()

    const autoLogin = async () => {
        const token = localStorage.getItem('token')
        if(!token){
            dispatch(new UserProfileLogout())
            setAutoLoginLoader((prevState => false))
            return
        }
        try{
            await badhanAxios.get('/users/me',{headers: {'x-auth':token}})
            dispatch(new UserProfileLogin(token))
        }catch(e: any){
            dispatch(new UserProfileLogout())
        }finally{
            setAutoLoginLoader((prevState => false))
        }
    }

    useEffect(()=>{
        autoLogin().then(r => {})
        // eslint-disable-next-line
    },[])

    return (
        <ErrorBoundary>
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={themes(customization)}>
                    <CssBaseline />
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
