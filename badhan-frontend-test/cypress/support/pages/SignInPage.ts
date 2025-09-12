export class SignInPage {
  visit(): void {
    cy.visit('/');
  }

  typePhone(phone: string): void {
    cy.get('[data-cy="signInPhoneTextBox"]').type(phone)
  }

  typePassword(password: string): void {
    cy.get('[data-cy="signInPasswordTextBox"]').type(password)
  }

  submit(): void {
    cy.get('[data-cy="signInButton"]').click();
  }

  signIn(phone: string, password: string): void {
    this.visit();
    this.typePhone(phone);
    this.typePassword(password);
    this.submit();
  }

  clearAuthToken(): void {
    cy.window().then((win) => {
      win.localStorage.removeItem('x-auth');
    });
  }

  reload(): void {
    cy.reload();
  }
}


