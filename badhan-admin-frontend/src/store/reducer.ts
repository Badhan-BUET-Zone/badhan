import { combineReducers } from '@reduxjs/toolkit';

// reducer import
import customizationReducer from './customizationReducer';
import notificationReducer from "./notificationReducer";
import userProfileReducer from "./userProfileReducer";

// ==============================|| COMBINE REDUCER ||============================== //

const reducer = combineReducers({
    customization: customizationReducer,
    notification: notificationReducer,
    userProfile: userProfileReducer
});

export default reducer;
