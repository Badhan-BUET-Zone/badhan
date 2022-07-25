import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {useDispatch, useSelector} from "react-redux";
import {ConfirmationDialogClose, ConfirmationDialogModel} from "../store/confirmationDialog/model";
import ReactDOM from "react-dom";

export default function ConfirmationDialog() {
    const dispatch = useDispatch()
    const confirmationDialog = useSelector((state: { confirmationDialog: ConfirmationDialogModel }) => state.confirmationDialog);

    const handleClose = () => {
        dispatch(new ConfirmationDialogClose())
    };
    const handleConfirmation = () => {
        confirmationDialog.confirmationFunction()
        handleClose()
    }

    return (
        <React.Fragment>
            {ReactDOM.createPortal(
                <div>
                    <Dialog
                        open={confirmationDialog.isOpen}
                        onClose={handleClose}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                    >
                        <DialogTitle id="alert-dialog-title">
                            Alert
                        </DialogTitle>
                        <DialogContent>
                            <DialogContentText id="alert-dialog-description">
                                {confirmationDialog.message}
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleClose}>Cancel</Button>
                            <Button onClick={handleConfirmation} autoFocus>
                                Confirm
                            </Button>
                        </DialogActions>
                    </Dialog>
                </div>
                , document.getElementById('confirmationDialog')!)}</React.Fragment>
    );
}
