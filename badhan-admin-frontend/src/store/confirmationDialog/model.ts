import {CLOSE_CONFIRMATION_DIALOG, ConfirmationDialogActionType, OPEN_CONFIRMATION_DIALOG} from "./actions";

export class ConfirmationDialogModel{
    isOpen: boolean
    message: string
    type: ConfirmationDialogActionType
    confirmationFunction: () => void

    constructor(isOpen: boolean, message: string, type: ConfirmationDialogActionType, confirmationFunction: () => void) {
        this.isOpen= isOpen;
        this.message = message;
        this.type = type
        this.confirmationFunction = confirmationFunction
    }
}

export class ConfirmationDialogOpen extends ConfirmationDialogModel{
    constructor(message: string, confirmationFunction: ()=>void) {
        super(true, message, OPEN_CONFIRMATION_DIALOG, confirmationFunction);
    }
}

export class ConfirmationDialogClose extends ConfirmationDialogModel {
    constructor() {
        super(false, '', CLOSE_CONFIRMATION_DIALOG, ()=>{});
    }
}
