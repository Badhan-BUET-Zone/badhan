import {Alert, Snackbar} from "@mui/material";
import {useDispatch, useSelector} from "react-redux";
import React from 'react';
import ReactDOM from 'react-dom'
import {NotificationModel, NotificationOff} from "../store/notificationModel";
import styles from './NotificationSnackbar.module.css'
export const NotificationSnackbar: React.FC = () =>{
    const notification = useSelector((state: { notification: NotificationModel}) => {
        return state.notification
    });
    const dispatch = useDispatch();
    const handleClose = () => {
        dispatch(new NotificationOff());
    }

    return (
        <React.Fragment>
            {ReactDOM.createPortal(<div><Snackbar open={notification.isOpen} autoHideDuration={6000} onClose={handleClose}>
                <Alert onClose={handleClose} severity={notification.notificationType} className={styles.snackbarAlert}>
                    {notification.message}
                </Alert>
            </Snackbar></div>, document.getElementById('notification')!)}
        </React.Fragment>
    )
}
