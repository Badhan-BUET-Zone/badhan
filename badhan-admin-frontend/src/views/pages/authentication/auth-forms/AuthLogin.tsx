import {useState} from 'react';
import { useNavigate } from "react-router-dom";
// material-ui
import {
    Box,
    Button, CircularProgress,
    FormControl,
    FormHelperText,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    OutlinedInput,
    Typography,
} from '@mui/material';

// third party
import * as Yup from 'yup';
import {Formik} from 'formik';

// project imports
import useScriptRef from '../../../../hooks/useScriptRef';

// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import FadeAnimationWrapper from "../../../../ui-component/motion/FadeAnimationWrapper";
import {useDispatch} from "react-redux";
import {UserProfileLogin} from "../../../../store/userProfileModel";
import {wait} from "../../../../utils/dummyAPI";

// ============================|| FIREBASE - LOGIN ||============================ //

const Login = ({...others}) => {
    const scriptedRef = useScriptRef();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const dispatch = useDispatch()

    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    return (
        <FadeAnimationWrapper>
            <Grid container direction="column" justifyContent="center" spacing={2}>
                <Grid item xs={12} container alignItems="center" justifyContent="center">
                    <Box sx={{mb: 2}}>
                        <Typography variant="subtitle1">Sign in with number address</Typography>
                    </Box>
                </Grid>
            </Grid>

            <Formik
                initialValues={{
                    number: '01521438557',
                    password: '123456',
                    submit: null
                }}
                validationSchema={Yup.object().shape({
                    number: Yup.string().matches(/^\d{11}$/, 'Phone number must be number of length 11').required('Phone is required'),
                    password: Yup.string().max(255).required('Password is required')
                })}
                onSubmit={async (values, {setErrors, setStatus, setSubmitting}) => {
                    try {
                        setSubmitting(true);
                        if (scriptedRef.current) {
                            setStatus({success: true});
                        }
                        await wait()
                        console.log(values)
                        dispatch(new UserProfileLogin('ABCDEFGHIJKL'))
                        navigate('/')
                    } catch (err: any) {
                        console.error(err);
                        if (scriptedRef.current) {
                            setStatus({success: false});
                            setErrors({submit: err.message});
                        }
                    } finally {
                        setSubmitting(false);
                    }
                }}
            >
                {({errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values}) => (
                    <form noValidate onSubmit={handleSubmit} {...others}>
                        <FormControl fullWidth error={Boolean(touched.number && errors.number)}>
                            <InputLabel htmlFor="outlined-adornment-number-login">Phone number</InputLabel>
                            <OutlinedInput
                                id="outlined-adornment-number-login"
                                type="string"
                                value={values.number}
                                name="number"
                                onBlur={handleBlur}
                                onChange={handleChange}
                                label="Phone number"
                                inputProps={{}}
                            />
                            {touched.number && errors.number && (
                                <FormHelperText error id="standard-weight-helper-text-number-login">
                                    {errors.number}
                                </FormHelperText>
                            )}
                        </FormControl>

                        <FormControl
                            fullWidth sx={{marginTop: '20px'}}
                            error={Boolean(touched.password && errors.password)}
                        >
                            <InputLabel htmlFor="outlined-adornment-password-login">Password</InputLabel>
                            <OutlinedInput
                                id="outlined-adornment-password-login"
                                type={showPassword ? 'text' : 'password'}
                                value={values.password}
                                name="password"
                                onBlur={handleBlur}
                                onChange={handleChange}
                                endAdornment={
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={handleClickShowPassword}
                                            edge="end"
                                            size="large"
                                        >
                                            {showPassword ? <Visibility/> : <VisibilityOff/>}
                                        </IconButton>
                                    </InputAdornment>
                                }
                                label="Password"
                                inputProps={{}}
                            />
                            {touched.password && errors.password && (
                                <FormHelperText error id="standard-weight-helper-text-password-login">
                                    {errors.password}
                                </FormHelperText>
                            )}
                        </FormControl>

                        {errors.submit && (
                            <Box sx={{mt: 3}}>
                                <FormHelperText error>{errors.submit}</FormHelperText>
                            </Box>
                        )}

                        <Box sx={{mt: 2}}>
                            <Button
                                disableElevation
                                disabled={isSubmitting}
                                fullWidth
                                size="large"
                                type="submit"
                                variant="contained"
                                color="secondary"
                            >
                                {isSubmitting && <CircularProgress/>}
                                Sign in
                            </Button>
                        </Box>
                    </form>
                )}
            </Formik>
        </FadeAnimationWrapper>
    );
};

export default Login;
