/**
 * How long a token minted by POST /users/redirection lives.
 *
 * The route has one caller-visible knob — `durationSeconds` — and the default, the floor and
 * the ceiling for it live here rather than at the route, for the same reason the feedback
 * token's do: they are properties of the token, not of the one endpoint that happens to mint
 * it today. The route validates as well; this is what makes the ceiling hold regardless.
 *
 * The default stays 30 seconds because that is what the existing caller needs and gets by
 * sending nothing: the web-redirection handoff, where the token crosses one URL and is spent
 * immediately.
 *
 * The ceiling is a day. That is generous for a token that can do everything its holder's
 * account can — but it is still strictly tighter than the session token it is minted from,
 * which never expires at all. Nothing here makes the token weaker than its parent, only
 * shorter-lived: a redirection token is an ordinary auth token to every route while it lives.
 *
 * It cannot be turned back into a permanent one. PATCH /users/redirection did exactly that and
 * was removed for it: an expiry means nothing if the holder can exchange the token for a
 * session that has none.
 */

export const REDIRECTION_TOKEN_DEFAULT_SECONDS: number = 30
export const REDIRECTION_TOKEN_MAX_SECONDS: number = 24 * 60 * 60 // 24 hours

export const clampRedirectionTokenSeconds = (durationSeconds?: number | null): number => {
  if (durationSeconds === undefined || durationSeconds === null || !Number.isFinite(durationSeconds)) {
    return REDIRECTION_TOKEN_DEFAULT_SECONDS
  }
  const whole: number = Math.floor(durationSeconds)
  return Math.min(Math.max(whole, 1), REDIRECTION_TOKEN_MAX_SECONDS)
}

// jsonwebtoken's `expiresIn` string form, which is what tokenInterface takes.
export const redirectionTokenExpiresIn = (durationSeconds?: number | null): string => {
  return `${clampRedirectionTokenSeconds(durationSeconds)}s`
}
