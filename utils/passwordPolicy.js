// Bee Cee Logistics — shared password strength policy
//
// Used by routes/auth.js on POST /signup and POST /reset-password so both
// entry points enforce the same rules. This is server-side Node code, so
// it can't be required() directly by the browser — the same rule set is
// mirrored in public/js/password-toggle.js's sibling checklist logic
// inline on signup.html / reset-password.html. If you change a rule here,
// update those two <script> blocks to match, or the live checklist will
// lie about what the server actually accepts.

const MIN_LENGTH = 8;

// A short blocklist of the passwords people reach for first. Not an
// exhaustive breached-password database — just a floor against the most
// obvious guesses, which is what actually stops casual brute forcing.
const COMMON_PASSWORDS = [
  "password", "password1", "password123", "12345678", "123456789",
  "qwertyui", "qwerty123", "letmein1", "admin1234", "welcome1",
  "iloveyou1", "beecee123", "logistics1", "changeme1", "abc123456",
  "11111111", "00000000", "adminadmin", "sunshine1",
];

/**
 * Returns an array of unmet-requirement phrases (empty array = password is
 * acceptable). `context.username` / `context.email` let it reject a
 * password that just contains the account's own identifiers.
 */
function getPasswordPolicyErrors(password, context = {}) {
  const pwd = password || "";
  const errors = [];

  if (pwd.length < MIN_LENGTH) errors.push(`at least ${MIN_LENGTH} characters`);
  if (!/[a-z]/.test(pwd)) errors.push("a lowercase letter");
  if (!/[A-Z]/.test(pwd)) errors.push("an uppercase letter");
  if (!/[0-9]/.test(pwd)) errors.push("a number");
  if (!/[^A-Za-z0-9]/.test(pwd)) errors.push("a symbol (e.g. ! @ # $ %)");

  const lowerPwd = pwd.toLowerCase();
  if (COMMON_PASSWORDS.includes(lowerPwd)) {
    errors.push("something less commonly used — that one shows up in common password lists");
  }

  const usernamePart = (context.username || "").toLowerCase().trim();
  if (usernamePart && usernamePart.length > 2 && lowerPwd.includes(usernamePart)) {
    errors.push("a password that doesn't contain your username");
  }

  const emailLocalPart = (context.email || "").toLowerCase().split("@")[0];
  if (emailLocalPart && emailLocalPart.length > 2 && lowerPwd.includes(emailLocalPart)) {
    errors.push("a password that doesn't contain your email");
  }

  return errors;
}

function formatPolicyMessage(errors) {
  if (!errors.length) return null;
  return `Password needs: ${errors.join(", ")}.`;
}

module.exports = { getPasswordPolicyErrors, formatPolicyMessage, MIN_LENGTH };
