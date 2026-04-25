# Supabase Auth Email Templates

These four templates replace the default Supabase Auth emails. They use The
Tower voice (doorman / concierge / lobby metaphor) and the Playfair-display +
gold-accent visual language used elsewhere in the product.

## How to apply

1. Open Supabase Dashboard → Authentication → Email Templates
2. For each template below, paste the HTML into the corresponding section
3. Set the subject line as shown
4. Save

These have to be pasted via the Dashboard. Supabase doesn't expose email
templates through the management API or MCP yet.

## Variables Supabase substitutes at send-time

- `{{ .ConfirmationURL }}` — the link the user clicks
- `{{ .Email }}` — the recipient's email address
- `{{ .SiteURL }}` — your site URL (configured in Auth settings)
- `{{ .Token }}` — the confirmation token (rarely needed in body)

## Files

- `confirm.html` — Confirm signup
- `magic-link.html` — Magic Link (passwordless sign-in)
- `reset.html` — Password recovery
- `invite.html` — Invite user

## Subject lines

- Confirm signup: `Welcome to The Tower`
- Magic Link: `Your key to The Tower`
- Reset Password: `Reset your Tower passphrase`
- Invite User: `You've been issued an access card`
