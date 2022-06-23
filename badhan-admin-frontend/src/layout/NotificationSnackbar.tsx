import {Alert, Snackbar} from "@mui/material";
import {useDispatch, useSelector} from "react-redux";

import React from 'react';

import {NotificationModel, NotificationOff} from "../store/notificationModel";

export const NotificationSnackbar: React.FC = () =>{
    const notification = useSelector((state: { notification: NotificationModel}) => {
        return state.notification
    });
    const dispatch = useDispatch();
    const handleClose = () => {
        dispatch(new NotificationOff());
    }
    return (
        <Snackbar open={notification.isOpen} autoHideDuration={6000} onClose={handleClose}>
            <Alert onClose={handleClose} severity={notification.notificationType} sx={{ width: '100%' }}>
                {notification.message}
            </Alert>
        </Snackbar>
    )
}
