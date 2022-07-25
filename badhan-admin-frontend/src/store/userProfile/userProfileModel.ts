import {LOGIN, LOGOUT, userprofileActionType} from "./userProfileActions";

export class UserProfileModel{
    token: string|null
    type: userprofileActionType

    constructor(token: string|null, type: userprofileActionType) {
        this.token = token
        this.type = type
    }
}

export class UserProfileLogout extends UserProfileModel{
    constructor() {
        super(null, LOGOUT);
    }
}
export class UserProfileLogin extends UserProfileModel{
    constructor(token: string) {
        super(token, LOGIN);
    }
}
