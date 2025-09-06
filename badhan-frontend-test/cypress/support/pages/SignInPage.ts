export class SignInPage {
  visit(): void {
    cy.visit('/');
  }

  typePhone(phone: string): void {
    cy.get('#signInPhoneTextBox').type(phone)
  }

  typePassword(password: string): void {
    cy.get('#signInPasswordTextBox').type(password)
  }

  submit(): void {
    cy.get('#signInButton').click();
  }
}


