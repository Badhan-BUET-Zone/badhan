import { combineReducers } from '@reduxjs/toolkit';

// reducer import
import customizationReducer from './customizationReducer';
import notificationReducer from "./notificationReducer";

// ==============================|| COMBINE REDUCER ||============================== //

const reducer = combineReducers({
    customization: customizationReducer,
    notification: notificationReducer
});

export default reducer;
