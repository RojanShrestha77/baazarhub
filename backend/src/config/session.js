// Decision #1 follow-ups: sliding window + independent absolute cap.
export const SESSION_SLIDING_WINDOW_MS = 30 * 60 * 1000; // 30 min of inactivity -> expired
export const SESSION_ABSOLUTE_CAP_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, no matter how active

// Decision #6: per-account exponential backoff, capped — not a hard lock.
export const LOGIN_BACKOFF_BASE_MS = 1000; // 1s
export const LOGIN_BACKOFF_FACTOR = 2;
export const LOGIN_BACKOFF_MAX_MS = 5 * 60 * 1000; // cap at 5 min
export const LOGIN_BACKOFF_RESET_AFTER_MS = 60 * 60 * 1000; // stale failure streak forgiven after 1h
