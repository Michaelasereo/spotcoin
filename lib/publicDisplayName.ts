/**
 * Label shown on the public recognition feed (and related team-facing surfaces).
 * Prefer workspace username when set; otherwise fall back to email.
 */
export function publicFeedDisplayName(user: { username: string | null; email: string }): string {
  const handle = user.username?.trim();
  if (handle) return handle;
  return user.email;
}
