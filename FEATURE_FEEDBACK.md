# FEATURE: In-App Feedback Mechanism

**Priority:** Low — Nice to have for early adopter insights
**Date:** March 17, 2026
**Author:** Francis Interlandi

---

## 1. Overview

Add a lightweight way for users to submit feedback from within Storyhand. Feedback is captured as structured server-side log entries that can be queried in Railway's log dashboard. No email, no database, no third-party services required.

---

## 2. Goals

- Let users share quick reactions without leaving the app
- Zero infrastructure overhead — no database, no email service, no accounts
- Feedback is queryable in Railway logs with a simple search
- Optional: forward feedback to a webhook (Slack, Discord) for real-time visibility

---

## 3. User Experience

### 3.1 Feedback Trigger

A small, unobtrusive feedback button appears in two places:

1. **Session view** — A subtle icon button (Lucide `MessageSquarePlus` or similar) in the header bar, next to the Exit button. Accessible during or after a session.
2. **Landing page** — A "Send Feedback" link in the footer, near the existing privacy policy link.

### 3.2 Feedback Modal

Clicking the button opens a lightweight modal or bottom sheet:

```
┌─────────────────────────────────────┐
│  How's Storyhand working for you?   │
│                                     │
│  😍  😊  😐  😕  😤              │
│                                     │
│  Anything else? (optional)          │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Cancel]            [Send]         │
└─────────────────────────────────────┘
```

**Fields:**
- **Sentiment** (required): 5-point emoji scale — maps to values 1–5 internally
- **Comment** (optional): Free-text field, max 500 characters
- **No name, no email** — fully anonymous, consistent with Storyhand's no-account philosophy

### 3.3 After Submission

- The modal closes
- A brief toast/snackbar: "Thanks for the feedback!"
- No confirmation email, no follow-up — one-way, fire-and-forget

---

## 4. Technical Design

### 4.1 Client → Server

New Socket.IO event (no REST endpoint needed since the socket is already connected):

```typescript
// Client emits
socket.emit('submit-feedback', {
  sentiment: 4,                    // 1-5 (😤 to 😍)
  comment: 'Love the 16-bit mode', // optional, max 500 chars
  context: {
    sessionId: 'C4A90F',           // null if from landing page
    tableTheme: '16bit',           // which theme was active
    playerCount: 3,                // how many players in the session
    roundsPlayed: 4,               // how many rounds completed
    role: 'host',                  // user's role in the session
  }
});
```

No callback needed — feedback is fire-and-forget from the user's perspective.

### 4.2 Server-Side: Structured Log Entry

The server handler writes a structured log line with a consistent prefix so it's searchable in Railway:

```javascript
socket.on('submit-feedback', (data) => {
  const { sentiment, comment, context } = data;

  // Validate
  if (!sentiment || sentiment < 1 || sentiment > 5) return;
  const sanitizedComment = (comment || '').slice(0, 500).replace(/\n/g, ' ');

  // Structured log entry — searchable in Railway by prefix [FEEDBACK]
  console.log(JSON.stringify({
    type: 'FEEDBACK',
    timestamp: new Date().toISOString(),
    sentiment,
    comment: sanitizedComment || null,
    sessionId: context?.sessionId || null,
    theme: context?.tableTheme || null,
    playerCount: context?.playerCount || null,
    roundsPlayed: context?.roundsPlayed || null,
    role: context?.role || null,
  }));
});
```

**Why JSON:** Railway logs can be searched and filtered. A JSON line with `type: 'FEEDBACK'` is easy to grep for and parse programmatically later.

**Search in Railway:** Go to your service logs and search for `FEEDBACK` — every feedback entry shows up as a parseable JSON object.

### 4.3 Optional: Webhook Forwarding

If you want real-time notifications, add a webhook POST after the log entry. This keeps Railway logs as the source of truth and adds a notification layer on top.

**Discord webhook (free, no account needed beyond a server):**

```javascript
const FEEDBACK_WEBHOOK = process.env.FEEDBACK_WEBHOOK_URL;

if (FEEDBACK_WEBHOOK) {
  const sentimentEmoji = ['', '😤', '😕', '😐', '😊', '😍'][sentiment];
  fetch(FEEDBACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: [
        `**${sentimentEmoji} New Feedback** (${sentiment}/5)`,
        comment ? `> ${sanitizedComment}` : null,
        `Session: ${context?.sessionId || 'landing page'} · Theme: ${context?.tableTheme || 'n/a'} · Players: ${context?.playerCount || 'n/a'} · Rounds: ${context?.roundsPlayed || 'n/a'}`,
      ].filter(Boolean).join('\n'),
    }),
  }).catch(() => {}); // Fire and forget — don't let webhook failures affect the app
}
```

Set `FEEDBACK_WEBHOOK_URL` as a Railway environment variable. If not set, webhook is silently skipped. Works identically with Slack incoming webhooks — just change the payload format.

---

## 5. Generating a Report

### Quick Check (Railway Dashboard)

Search the Railway logs for `FEEDBACK`. Each entry is a self-contained JSON line.

### Automated Report Script

Run locally or as a Railway cron job to aggregate feedback:

```bash
# Export Railway logs for the last 7 days and extract feedback
railway logs --json | grep '"type":"FEEDBACK"' | jq -s '
  {
    total: length,
    average_sentiment: (map(.sentiment) | add / length),
    sentiment_distribution: group_by(.sentiment) | map({sentiment: .[0].sentiment, count: length}),
    comments: map(select(.comment != null) | {sentiment, comment, theme, timestamp}),
    by_theme: group_by(.theme) | map({theme: .[0].theme, avg: (map(.sentiment) | add / length), count: length})
  }
'
```

This gives you: total feedback count, average sentiment, distribution (how many 1s, 2s, etc.), all comments with context, and sentiment broken down by theme.

### Future: Dashboard Page

If feedback volume grows, add a simple `/admin/feedback` page that fetches from a new API endpoint. But for now, Railway logs + the script above is more than sufficient.

---

## 6. Rate Limiting

Prevent spam without authentication:

- **Client-side:** Disable the feedback button for 60 seconds after submission. Store the last submission timestamp in `sessionStorage`.
- **Server-side:** Track submissions per socket ID. Max 3 feedback entries per socket connection. After 3, silently ignore further submissions.

No CAPTCHA, no auth — just simple throttling.

---

## 7. Files to Create/Modify

**New files:**
- `client/src/components/FeedbackModal.tsx` — The modal UI (emoji selector + comment field)

**Modified files:**
- `client/src/types/game.ts` — Add feedback-related types (optional, could keep it lightweight)
- `client/src/components/Header.tsx` — Add feedback icon button
- `client/src/pages/LandingPage.tsx` — Add "Send Feedback" footer link
- `client/src/hooks/useGameState.tsx` — Add `submitFeedback` action that emits the event
- `server/index.js` — Add `submit-feedback` event handler with logging

---

## 8. Acceptance Criteria

1. A feedback button is visible in the session header and on the landing page footer
2. Clicking it opens a modal with a 5-point emoji sentiment selector and optional comment field
3. Submitting feedback logs a structured JSON entry to the server console with prefix type `FEEDBACK`
4. The entry is searchable in Railway logs by filtering for `FEEDBACK`
5. Each entry includes: timestamp, sentiment (1-5), comment (if provided), session ID, theme, player count, rounds played, and role
6. After submission, a "Thanks" toast appears and the modal closes
7. The feedback button is disabled for 60 seconds after submission (client-side)
8. Server ignores more than 3 feedback submissions per socket connection
9. No user data is collected — feedback is fully anonymous
10. If `FEEDBACK_WEBHOOK_URL` environment variable is set, feedback is also forwarded to the webhook
11. If the webhook is not configured or fails, the app is unaffected
12. Feedback works in both classic and 16-bit themes (modal styled appropriately)
