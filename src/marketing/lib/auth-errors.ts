/** Map raw Supabase Auth errors to the wording people should see on login and signup. */
export function friendlyAuthError(message: string, context: "login" | "signup") {
  const text = message.trim();
  const lower = text.toLowerCase();

  if (/invalid login credentials|invalid_credentials/.test(lower)) {
    return "That email or password does not match. If you were invited, open the invitation email and set your password first.";
  }
  if (/email not confirmed|not confirmed/.test(lower)) {
    return "Confirm your email first. Check your inbox for a verification code or an invitation to set your password.";
  }
  if (/already registered|user already registered/.test(lower)) {
    return "This email already has an account. Sign in, or open the invitation email to set your password.";
  }
  if (/signups not allowed|signup is disabled/.test(lower)) {
    return context === "signup"
      ? "Self-serve sign-up is closed. Ask an admin to send you an invitation."
      : text;
  }
  if (/rate limit|over_email_send|email rate/.test(lower)) {
    return "Too many emails sent. Wait a minute and try again.";
  }
  if (/expired|otp_expired/.test(lower)) {
    return "That code or link has expired. Request a new one.";
  }
  if (/invalid.*otp|token.*invalid|otp_disabled/.test(lower)) {
    return "That code is not valid. Check the latest email and try again.";
  }
  return text || (context === "login" ? "Sign-in failed." : "Could not start sign-up.");
}
