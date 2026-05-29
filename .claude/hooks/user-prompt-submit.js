#!/usr/bin/env node

/**
 * UserPromptSubmit Hook
 * Fires every time you send a message to Claude Code.
 * Appends the exact current timestamp to your message context.
 * This way Claude always knows exactly what time each message was sent —
 * even if you were away for hours.
 */

const now = new Date();

const timeStr = now.toLocaleTimeString("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

const dateStr = now.toLocaleDateString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Read the incoming prompt event from stdin (Claude Code passes it as JSON)
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  // Inject timestamp as additional context alongside the user's message
  const output = {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: `[MESSAGE TIMESTAMP] This message was sent at ${timeStr} on ${dateStr} (${timezone}). Unix timestamp: ${now.getTime()}ms.`,
    },
  };

  process.stdout.write(JSON.stringify(output));
});
