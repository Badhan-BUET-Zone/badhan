import * as actionTypes from './actions';
import {ConfirmationDialogClose} from "./model";
import {ConfirmationDialogModel} from "./model";
export const initialState :ConfirmationDialogModel = new ConfirmationDialogClose()

const confirmationDialogReducer = (state = initialState, action: ConfirmationDialogModel) => {
    switch (action.type) {
        case actionTypes.CLOSE_CONFIRMATION_DIALOG:
            return action;
        case actionTypes.OPEN_CONFIRMATION_DIALOG:
            return action;
        default:
            return state;
    }
};

export default confirmationDialogReducer;
