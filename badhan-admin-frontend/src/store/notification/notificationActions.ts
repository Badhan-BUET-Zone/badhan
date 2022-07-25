export const NOTIFICATION_ON = '@notification/NOTIFICATION_ON';
export const NOTIFICATION_OFF = '@notification/NOTIFICATION_OFF';

export type NotificationActionType = typeof NOTIFICATION_ON | typeof NOTIFICATION_OFF;

export const NOTIFICATION_SUCCESS = 'success'
export const NOTIFICATION_ERROR = 'error'
export const NOTIFICATION_WARNING = 'warning'
export const NOTIFICATION_INFO = 'info'

export type NotificationType = typeof NOTIFICATION_SUCCESS | typeof NOTIFICATION_ERROR | typeof NOTIFICATION_INFO | typeof NOTIFICATION_WARNING
