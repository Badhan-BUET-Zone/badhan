// Documentation screenshots must show the app, not the test environment. The dev-database
// watermark and the transient snackbars are both fixed-position and float over whatever element is
// being captured, so they are hidden with a stylesheet just before the shot.
export const hideOverlays = (): void => {
  cy.document().then((doc) => {
    const style = doc.createElement('style');
    style.innerHTML = '.env-watermark, .v-snack { display: none !important; }';
    doc.head.appendChild(style);
  });
};
