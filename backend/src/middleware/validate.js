// Validation library wiring (zod). This is plumbing only — the actual
// field rules (password policy, email format, TOTP code shape, etc.) are
// TODO in src/validators/auth.schemas.js, not here.

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten(),
      });
    }
    req.validatedBody = result.data;
    next();
  };
}
