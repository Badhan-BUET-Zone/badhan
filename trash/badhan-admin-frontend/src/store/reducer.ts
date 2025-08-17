import { combineReducers } from '@reduxjs/toolkit';

// reducer import
import customizationReducer from './customization/customizationReducer';
import notificationReducer from "./notification/notificationReducer";
import userProfileReducer from "./userProfile/userProfileReducer";
import confirmationDialogReducer from './confirmationDialog/reducer'

// ==============================|| COMBINE REDUCER ||============================== //

const reducer = combineReducers({
    customization: customizationReducer,
    notification: notificationReducer,
    userProfile: userProfileReducer,
    confirmationDialog: confirmationDialogReducer
});

export default reducer;

