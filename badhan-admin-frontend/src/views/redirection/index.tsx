import {Link, useNavigate} from 'react-router-dom';

// material-ui
import {useTheme} from '@mui/material/styles';
import {Divider, Grid, LinearProgress, Stack, Typography, useMediaQuery} from '@mui/material';

// project imports
import AuthWrapper1 from '../pages/authentication/AuthWrapper1';
import AuthCardWrapper from '../pages/authentication/AuthCardWrapper';
import Logo from '../../ui-component/Logo';
import AuthFooter from '../../ui-component/cards/AuthFooter';
import {useEffect} from "react";
import {useSearchParams} from 'react-router-dom'
import {useDispatch, useSelector} from "react-redux";
import {UserProfileLogin, UserProfileModel} from "../../store/userProfile/userProfileModel";
import {handleDELETEUsersSignOut, handlePATCHUsersRedirection} from "../../api";


const Login = () => {
    const theme = useTheme();
    const matchDownSM = useMediaQuery(theme.breakpoints.down('md'));
    const [searchParams,] = useSearchParams();
    const userProfile = useSelector((state: { userProfile: UserProfileModel }) => state.userProfile);
    const navigate = useNavigate();
    const dispatch = useDispatch()

    const authenticateRedirectedUser = async () => {
        console.log(`token: ${searchParams.get("token")}`)
        if (userProfile.token) {
            console.log('previous token detected')
            await handleDELETEUsersSignOut()
        }
        const redirectionResponse = await handlePATCHUsersRedirection({token: searchParams.get("token")!})
        if (redirectionResponse.status !== 201) {
            console.log('unsuccessful login')
            navigate('/pages/login')
            return
        }

        console.log('successful login')
        dispatch(new UserProfileLogin(redirectionResponse.data.token))
        navigate('/')
    }

    useEffect(() => {
        authenticateRedirectedUser().then()
        // eslint-disable-next-line
    }, [])

    return (
        <AuthWrapper1>
            <Grid container direction="column" justifyContent="flex-end" sx={{minHeight: '100vh'}}>
                <Grid item xs={12}>
                    <Grid container justifyContent="center" alignItems="center" sx={{minHeight: 'calc(100vh - 68px)'}}>
                        <Grid item sx={{m: {xs: 1, sm: 3}, mb: 0}}>
                            <AuthCardWrapper>
                                <Grid container spacing={2} alignItems="center" justifyContent="center">
                                    <Grid item sx={{mb: 3}}>
                                        <Link to="#">
                                            <Logo/>
                                        </Link>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Grid
                                            container
                                            direction={matchDownSM ? 'column-reverse' : 'row'}
                                            alignItems="center"
                                            justifyContent="center"
                                        >
                                            <Grid item>
                                                <Stack alignItems="center" justifyContent="center" spacing={1}>
                                                    <Typography
                                                        color={theme.palette.secondary.main}
                                                        gutterBottom
                                                        variant={matchDownSM ? 'h3' : 'h2'}
                                                    >
                                                        Welcome user
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        fontSize="16px"
                                                        textAlign={matchDownSM ? 'center' : 'inherit'}
                                                    >
                                                        Redirecting...
                                                    </Typography>
                                                </Stack>
                                                <LinearProgress sx={{marginTop: '30px'}}/>
                                            </Grid>

                                        </Grid>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Divider/>
                                    </Grid>
                                </Grid>
                            </AuthCardWrapper>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item xs={12} sx={{m: 3, mt: 1}}>
                    <AuthFooter/>
                </Grid>
            </Grid>
        </AuthWrapper1>
    );
};

export default Login;
