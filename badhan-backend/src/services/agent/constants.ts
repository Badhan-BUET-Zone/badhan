// Badhan Agent's fixed numbers. None of them is a setting: the page offers no choice, and the
// backend enforces each one rather than trusting the browser to.

// The model, and the only reasoning setting it accepts alongside function tools on
// /v1/chat/completions. Keeping reasoning would mean moving to /v1/responses.
export const AGENT_MODEL: string = 'gpt-6-luna'
export const AGENT_REASONING_EFFORT: string = 'none'

// The only usage limit there is. A member's message may lead to at most this many model calls
// before the agent stops and waits for another message. There is no daily budget.
export const MAX_MODEL_CALLS_PER_MESSAGE: number = 20

// A member's message.
export const MAX_USER_CONTENT_CHARS: number = 20000

// A chat's automatic title: the first line of its first message, cut to this.
export const MAX_AUTO_TITLE_CHARS: number = 60

// What the model is sent of one tool result. Enough for a few hundred donor records; anything
// longer is cut, and the model is told so, rather than overflowing its context.
export const MAX_RESULT_CHARS: number = 60000

// What the card shows of one tool result. Larger, since a person can scroll; bounded so storage
// and the size of each result report stay sane.
export const MAX_DISPLAY_CHARS: number = 250000

// A note on a failed tool call, as the browser reports it.
export const MAX_NOTE_CHARS: number = 2000

// The per-chat step lock is treated as free once it is this old: a step whose process died, or
// whose browser vanished, must not lock the chat for ever.
export const STEP_LOCK_STALE_MS: number = 3 * 60 * 1000

// How long one model call may take before it counts as unreachable.
export const OPENAI_TIMEOUT_MS: number = 90 * 1000

// The session note states the time here. The backend runs in UTC; the members are in Bangladesh.
export const SESSION_TIME_ZONE: string = 'Asia/Dhaka'
