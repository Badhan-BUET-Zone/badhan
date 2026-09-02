/**
 * How long a token minted by POST /users/redirection lives: forever.
 *
 * It used to carry a 30-second default and a 24-hour ceiling, both chosen for the web
 * redirection handoff — a token that crosses one URL and is spent immediately. The MCP server
 * changed what this token is FOR. An MCP client config is written into a settings file once and
 * left alone, and a token that lapses on any clock at all means editing that file on that clock,
 * which nobody does. They go looking for a permanent credential instead, and that search ends
 * somewhere worse than here.
 *
 * So there is no clock. `expiresIn` is null, jwt.sign emits no `exp` claim, and the token is
 * valid for as long as its row exists in the tokens collection.
 *
 * THAT ROW IS THE REVOCATION, and it is the only one:
 *
 *   - DELETE /users/logins/{tokenId} deletes one token. This is My Profile's device list, where
 *     every minted token appears as a card with its own Logout button. It is the intended way to
 *     end one connection.
 *   - DELETE /users/signout/all deletes every token the donor holds.
 *   - DELETE /users/signout deletes only the token that made the request, so signing out of a
 *     browser does NOT touch a token minted for an assistant.
 *
 * What this costs, stated plainly because the expiry is no longer there to cover it: a leaked
 * config file is a live credential with the full powers of its owner's role until a human
 * notices and deletes that row. Nothing expires on its own any more.
 */

// Null rather than a number: tokenInterface.insertAndSaveTokenWithExpiry omits the jwt option
// entirely when this is null, which is what produces a token with no `exp` claim. A very large
// number would be a different thing — an expiry nobody will live to see, still written into the
// token — and this is deliberately not that.
export const REDIRECTION_TOKEN_EXPIRES_IN: string | null = null
