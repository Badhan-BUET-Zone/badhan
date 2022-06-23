import * as actionTypes from './notificationActions';
import {NotificationModel, NotificationOff} from './notificationModel'
export const initialState :NotificationModel = new NotificationOff()

const notificationReducer = (state = initialState, action: NotificationModel) => {
    switch (action.type) {
        case actionTypes.NOTIFICATION_ON:
            return action;
        case actionTypes.NOTIFICATION_OFF:
            return action;
        default:
            return state;
    }
};

export default notificationReducer;
