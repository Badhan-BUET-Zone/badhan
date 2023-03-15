import { ui } from '../../plugins/frontend'
import env from '../../plugins/env'
describe('Designated Donors', () => {
    it('should get all designated donors', () => {
        // sign in
        ui.control.start()
        ui.pages.signIn.phoneTextBox.type(env.SUPERADMIN_PHONE)
        ui.pages.signIn.passwordTextBox.type(env.SUPERADMIN_PASSWORD)
        ui.pages.signIn.signInButton.click()

        //edit all information of person details
        ui.components.topBar.drawerButton.click()
        ui.components.topBar.drawer.myProfileLink.click()
        ui.pages.personDetails.details.nameTextBox.type("Random Donor")
        ui.pages.personDetails.details.phoneTextBox.type("01521438557")
        ui.pages.personDetails.details.emailTextBox.type("mirmahathir2@gmail.com")
        ui.pages.personDetails.details.bloodGroupSelection.click()
        ui.pages.personDetails.details.bloodGroupSelection.getSelectionMenuByBloodGroup('O+').click()
        ui.pages.personDetails.details.studentIdTextBox.type("1605010")
        ui.pages.personDetails.details.commentTextBox.type("Random Comment")
        ui.pages.personDetails.details.addressTextBox.type("Random Address")
        ui.pages.personDetails.details.hallSelection.click()
        ui.pages.personDetails.details.hallSelection.getSelectionMenuByHallName("Ahsanullah").click()
        ui.pages.personDetails.details.publicDataCheckBox.click()
        ui.pages.personDetails.details.saveButton.click()
        ui.components.notificationSnackBar.contains("Saved details successfully")
        ui.pages.personDetails.details.commentTextBox.type("Random Comment")
        ui.pages.personDetails.details.saveCommentButton.click()
        ui.components.notificationSnackBar.contains("Successfully changed comment")

        // check that all editted information are persistent
        ui.control.reload()
        ui.pages.personDetails.details.nameTextBox.contains("Random Donor")
        ui.pages.personDetails.details.phoneTextBox.contains("01521438557")
        ui.pages.personDetails.details.emailTextBox.contains("mirmahathir2@gmail.com")
        ui.pages.personDetails.details.bloodGroupSelection.contains("O+")
        ui.pages.personDetails.details.studentIdTextBox.contains("1605010")
        ui.pages.personDetails.details.commentTextBox.contains("Random Comment")
        ui.pages.personDetails.details.addressTextBox.contains("Random Address")
        ui.pages.personDetails.details.hallSelection.contains("Ahsanullah")
        ui.pages.personDetails.details.publicDataCheckBox.contains(true)
        ui.pages.personDetails.details.commentTextBox.contains("Random Comment")

        //revert back edits
        ui.pages.personDetails.details.nameTextBox.type("Mir Mahathir Mohammad")
        ui.pages.personDetails.details.phoneTextBox.type('01521438557')
        ui.pages.personDetails.details.emailTextBox.type("mirmahathir1@gmail.com")
        ui.pages.personDetails.details.bloodGroupSelection.click()
        ui.pages.personDetails.details.bloodGroupSelection.getSelectionMenuByBloodGroup('B+').click()
        ui.pages.personDetails.details.studentIdTextBox.type("1605011")
        ui.pages.personDetails.details.commentTextBox.type("Developer of Badhan Web and Android")
        ui.pages.personDetails.details.addressTextBox.type("Azimpur Road")
        ui.pages.personDetails.details.hallSelection.click()
        ui.pages.personDetails.details.hallSelection.getSelectionMenuByHallName("Suhrawardy").click()
        ui.pages.personDetails.details.publicDataCheckBox.unClick()
        ui.pages.personDetails.details.saveButton.click()
        ui.components.notificationSnackBar.contains("Saved details successfully")
        ui.pages.personDetails.details.commentTextBox.type("Is not available for donation")
        ui.pages.personDetails.details.saveCommentButton.click()
        ui.components.notificationSnackBar.contains("Successfully changed comment")

        // sign out
        ui.control.scroll.top()
        ui.components.topBar.tripleDotButton.click()
        ui.components.topBar.tripleDotButton.tripleDotButtonMenu.signOutMenuButton.click()
        ui.components.confirmationModal.okButton.click()
        ui.components.notificationSnackBar.contains("Logged out successfully")
    })})
