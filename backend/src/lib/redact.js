const SENSITIVE_KEY = /password|secret|token|authorization|cookie|totp[_-]?secret|recovery[_-]?code|credit[_-]?card|cvv|ssn|pin|api[_-]?key|stripe[_-]?key|stripe[_-]?secret/i;

const REDACTED = "[REDACTED]";

export function redactObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redactObject);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEY.test(key)) {
      result[key] = REDACTED;
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function redactString(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/(password|secret|token|authorization|api[_-]?key|stripe[_-]?key|stripe[_-]?secret)=[^&\s]+/gi, "$1=" + REDACTED)
    .replace(/(Bearer\s+)[A-Za-z0-9\-._~+/=]+/g, "$1" + REDACTED)
    .replace(/totp[_-]?secret["\s:=]+(?!\[REDACTED\])[^\s,"}\]]+/gi, "totp_secret=" + REDACTED)
    .replace(/recovery[_-]?code["\s:=]+(?!\[REDACTED\])[^\s,"}\]]+/gi, "recovery_code=" + REDACTED);
}

export function wrapConsoleError() {
  const original = console.error.bind(console);
  console.error = function (...args) {
    const redacted = args.map((a) => {
      if (typeof a === "string") return redactString(a);
      if (a instanceof Error) {
        const err = a;
        err.message = redactString(err.message);
        return err;
      }
      if (a && typeof a === "object") return redactObject(a);
      return a;
    });
    Reflect.apply(original, console, redacted);
  };
  return () => { console.error = original; };
}
