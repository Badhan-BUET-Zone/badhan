import {useState, useRef, useEffect} from 'react';

import {useDispatch, useSelector} from 'react-redux';

import React from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import {
    Avatar,
    Box,
    Chip,
    ClickAwayListener,
    Divider,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Popper,
    Stack,
    Typography
} from '@mui/material';

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar';

// project imports
import MainCard from '../../../../ui-component/cards/MainCard';
import Transitions from '../../../../ui-component/extended/Transitions';
import User1 from '../../../../assets/images/users/user-round.svg';

// assets
import { IconLogout, IconSettings } from '@tabler/icons';

import {CustomizationModel} from "../../../../store/customization/customizationModel";
import {useNavigate} from "react-router-dom";

import styleClasses from './index.module.css'
import {UserProfileLogout} from "../../../../store/userProfile/userProfileModel";
import {ConfirmationDialogOpen} from "../../../../store/confirmationDialog/model";
import { handleDELETEUsersSignOut} from "../../../../api";

// ==============================|| PROFILE MENU ||============================== //

const ProfileSection = () => {
    const theme = useTheme();
    const customization = useSelector((state: {customization: CustomizationModel}) => state.customization);

    const [selectedIndex, ] = useState(-1);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch()
    /**
     * anchorRef is used on different componets and specifying one type leads to other components throwing an error
     * */
    const anchorRef = useRef(null);

    const logoutConfirmed = async () => {
        try{
            await handleDELETEUsersSignOut()
        }catch (e) {

        }finally {
            dispatch(new UserProfileLogout());
            navigate('/pages/login')
        }
    }

    const handleLogout = async () => {
        dispatch(new ConfirmationDialogOpen('Do you want to log out?',logoutConfirmed))
    };

    /* @ts-ignore */
    const handleClose = (event) => {
        /* @ts-ignore */
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return;
        }
        setOpen(false);
    };

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen);
    };

    const prevOpen = useRef(open);
    useEffect(() => {
        if (prevOpen.current && !open) {
            /* @ts-ignore */
            anchorRef.current.focus();
        }

        prevOpen.current = open;
    }, [open]);

    return (
        <React.Fragment>
            <Chip
                sx={{
                    height: '48px',
                    alignItems: 'center',
                    borderRadius: '27px',
                    transition: 'all .2s ease-in-out',
                    borderColor: theme.palette.primary.light,
                    backgroundColor: theme.palette.primary.light,
                    '&[aria-controls="menu-list-grow"], &:hover': {
                        borderColor: theme.palette.primary.main,
                        background: `${theme.palette.primary.main}!important`,
                        color: theme.palette.primary.light,
                        '& svg': {
                            stroke: theme.palette.primary.light
                        }
                    },
                    '& .MuiChip-label': {
                        lineHeight: 0
                    }
                }}
                icon={
                    <Avatar
                        src={User1}
                        sx={{
                            // @ts-ignore
                            ...theme.typography.mediumAvatar,
                            margin: '8px 0 8px 8px !important',
                            cursor: 'pointer'
                        }}
                        ref={anchorRef}
                        aria-controls={open ? 'menu-list-grow' : undefined}
                        aria-haspopup="true"
                        color="inherit"
                    />
                }
                label={<IconSettings stroke={1.5} size="1.5rem" color={theme.palette.primary.main} />}
                variant="outlined"
                ref={anchorRef}
                aria-controls={open ? 'menu-list-grow' : undefined}
                aria-haspopup="true"
                onClick={handleToggle}
                color="primary"
            />
            <Popper
                placement="bottom-end"
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                transition
                disablePortal
                popperOptions={{
                    modifiers: [
                        {
                            name: 'offset',
                            options: {
                                offset: [0, 14]
                            }
                        }
                    ]
                }}
            >
                {({ TransitionProps }) => (
                    /* @ts-ignore */
                    <Transitions in={open} {...TransitionProps}>
                        <Paper>
                            <ClickAwayListener onClickAway={handleClose}>
                                {/* @ts-ignore */}
                                <MainCard border={false} elevation={16} content={false} boxShadow shadow={theme.shadows[16]}>
                                    <Box sx={{ p: 2 }}>
                                        <Stack>
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <Typography variant="h4">Welcome,</Typography>
                                                <Typography component="span" variant="h4" sx={{ fontWeight: 400 }}>
                                                    user
                                                </Typography>
                                            </Stack>
                                            <Typography variant="subtitle2">Super Admin</Typography>
                                        </Stack>
                                        <Divider />
                                    </Box>
                                    <PerfectScrollbar style={{ height: '100%', maxHeight: 'calc(100vh - 250px)', overflowX: 'hidden' }}>
                                        <Box sx={{ p: 2 }}>
                                            <span className={styleClasses.mobileShow}>Accessing from mobile</span>
                                            <span className={styleClasses.pcShow}>Accessing from desktop</span>
                                            <List
                                                component="nav"
                                                sx={{
                                                    width: '100%',
                                                    maxWidth: 350,
                                                    minWidth: 300,
                                                    backgroundColor: theme.palette.background.paper,
                                                    borderRadius: '10px',
                                                    [theme.breakpoints.down('md')]: {
                                                        minWidth: '100%'
                                                    },
                                                    '& .MuiListItemButton-root': {
                                                        mt: 0.5
                                                    }
                                                }}
                                            >

                                                <ListItemButton
                                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                    selected={selectedIndex === 4}
                                                    onClick={handleLogout}
                                                >
                                                    <ListItemIcon>
                                                        <IconLogout stroke={1.5} size="1.3rem" />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant="body2">Logout</Typography>} />
                                                </ListItemButton>
                                            </List>
                                        </Box>
                                    </PerfectScrollbar>
                                </MainCard>
                            </ClickAwayListener>
                        </Paper>
                    </Transitions>
                )}
            </Popper>
        </React.Fragment>
    );
};

export default ProfileSection;
