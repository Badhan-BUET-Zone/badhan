import {IconButton, Snackbar} from "@mui/material";
import {useDispatch, useSelector} from "react-redux";
import Button from '@mui/material/Button';
import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import {NOTIFICATION_OFF} from "../store/notificationActions";
export const NotificationSnackbar: React.FC = () =>{
    const notification = useSelector((state: { notification: boolean}) => {
        return state.notification
    });
    const dispatch = useDispatch();
    const handleClose = () => {
        dispatch({ type: NOTIFICATION_OFF});
    }
    const action = (
        <React.Fragment>
            <Button color="secondary" size="small" onClick={handleClose}>
                UNDO
            </Button>
            <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={handleClose}
            >
                <CloseIcon fontSize="small" />
            </IconButton>
        </React.Fragment>
    );
    return (
        <Snackbar
            open={notification}
            autoHideDuration={1000}
            onClose={handleClose}
            message="Note archived"
            action={action}
        />
    )
}
