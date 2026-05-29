#!/usr/bin/env node

/**
 * SessionStart Hook
 * Fires once when Claude Code starts or resumes.
 * Injects the current time as context so Claude immediately knows what time it is.
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

const output = {
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: `[SESSION STARTED] Current time: ${timeStr} on ${dateStr} (${timezone}). Timestamp: ${now.getTime()}ms. Use get_current_time tool to check the time at any point during this session.`,
  },
};

process.stdout.write(JSON.stringify(output));
