export class CustomizationModel{
    isOpen: string[]; // for active default menu
    fontFamily: string[];
    borderRadius: number;
    opened: boolean;

    constructor(isOpen: string[], fontFamily: string[], borderRadius: number, opened: boolean) {
        this.isOpen= isOpen;
        this.fontFamily = fontFamily;
        this.borderRadius = borderRadius;
        this.opened = opened
    }
}
