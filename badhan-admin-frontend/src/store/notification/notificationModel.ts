import {
    NOTIFICATION_ERROR,
    NOTIFICATION_OFF,
    NOTIFICATION_ON,
    NOTIFICATION_SUCCESS,
    NotificationActionType,
    NotificationType
} from "./notificationActions";

export class NotificationModel{
    isOpen: boolean
    message: string
    notificationType: NotificationType
    type: NotificationActionType

    constructor(isOpen: boolean, message: string, notificationType: NotificationType, type: NotificationActionType) {
        this.isOpen= isOpen;
        this.message = message;
        this.notificationType = notificationType;
        this.type = type
    }
}

export class NotificationSuccess extends NotificationModel{
    constructor(message: string) {
        super(true,message,NOTIFICATION_SUCCESS,NOTIFICATION_ON);
    }
}
export class NotificationError extends NotificationModel{
    constructor(message: string) {
        super(true,message,NOTIFICATION_ERROR,NOTIFICATION_ON);
    }
}
export class NotificationOff extends NotificationModel{
    constructor() {
        super(false,"",NOTIFICATION_SUCCESS, NOTIFICATION_OFF);
    }
}
