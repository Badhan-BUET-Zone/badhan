import { combineReducers } from '@reduxjs/toolkit';

// reducer import
import customizationReducer from './customizationReducer';
import notificationReducer from "./notificationReducer";
import userProfileReducer from "./userProfileReducer";
import confirmationDialogReducer from './confirmationDialog/reducer'

// ==============================|| COMBINE REDUCER ||============================== //

const reducer = combineReducers({
    customization: customizationReducer,
    notification: notificationReducer,
    userProfile: userProfileReducer,
    confirmationDialog: confirmationDialogReducer
});

export default reducer;
