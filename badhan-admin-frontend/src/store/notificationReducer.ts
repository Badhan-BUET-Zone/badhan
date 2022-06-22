import * as actionTypes from './notificationActions';

export const initialState = false

const customizationReducer = (state = initialState, action: {type: string}) => {
    switch (action.type) {
        case actionTypes.NOTIFICATION_ON:
            return true;
        case actionTypes.NOTIFICATION_OFF:
            return false;
        default:
            return state;
    }
};

export default customizationReducer;
