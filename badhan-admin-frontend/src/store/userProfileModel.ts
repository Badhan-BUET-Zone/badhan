import {LOGIN, LOGOUT, userprofileActionType} from "./userProfileActions";

export class UserProfileModel{
    token: string
    type: userprofileActionType

    constructor(token: string, type: userprofileActionType) {
        this.token = token
        this.type = type
    }
}

export class UserProfileLogout extends UserProfileModel{
    constructor() {
        super('', LOGOUT);
    }
}
export class UserProfileLogin extends UserProfileModel{
    constructor(token: string) {
        super(token, LOGIN);
    }
}
