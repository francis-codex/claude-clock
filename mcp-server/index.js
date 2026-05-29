#!/usr/bin/env node

/**
 * Claude Clock MCP Server
 * Gives Claude Code real-time access to your system clock.
 * Tools: get_current_time, get_time_elapsed, get_session_info
 */

const SESSION_START = new Date();

// --- MCP Protocol Helpers (stdio = newline-delimited JSON) ---

function sendResponse(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

function sendError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");
}

// --- Tool Implementations ---

function getCurrentTime() {
  const now = new Date();
  return {
    iso: now.toISOString(),
    time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }),
    date: now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    timestamp_ms: now.getTime(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    utc_offset: -now.getTimezoneOffset() / 60,
  };
}

function getTimeElapsed(args) {
  const now = Date.now();
  const since_ms = args?.since_timestamp_ms;

  if (typeof since_ms !== "number" || !Number.isFinite(since_ms)) {
    return { __error: "Provide since_timestamp_ms (number) from a previous get_current_time call." };
  }

  const elapsed_ms = now - since_ms;
  const elapsed_s = Math.floor(elapsed_ms / 1000);
  const hours = Math.floor(elapsed_s / 3600);
  const minutes = Math.floor((elapsed_s % 3600) / 60);
  const seconds = elapsed_s % 60;

  return {
    elapsed_ms,
    elapsed_seconds: elapsed_s,
    human_readable:
      hours > 0
        ? `${hours}h ${minutes}m ${seconds}s`
        : minutes > 0
        ? `${minutes}m ${seconds}s`
        : `${seconds}s`,
    hours,
    minutes,
    seconds,
  };
}

function getSessionInfo() {
  const now = new Date();
  const elapsed_ms = now - SESSION_START;
  const elapsed_s = Math.floor(elapsed_ms / 1000);
  const hours = Math.floor(elapsed_s / 3600);
  const minutes = Math.floor((elapsed_s % 3600) / 60);
  const seconds = elapsed_s % 60;

  return {
    session_started_at: SESSION_START.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }),
    session_started_iso: SESSION_START.toISOString(),
    current_time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }),
    session_duration:
      hours > 0
        ? `${hours}h ${minutes}m ${seconds}s`
        : minutes > 0
        ? `${minutes}m ${seconds}s`
        : `${seconds}s`,
    session_duration_ms: elapsed_ms,
  };
}

// --- MCP Request Router ---

function handleRequest(req) {
  const { id, method, params } = req;

  if (method === "initialize") {
    return sendResponse(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "claude-clock", version: "1.0.0" },
    });
  }

  if (method === "ping") {
    return sendResponse(id, {});
  }

  if (method === "tools/list") {
    return sendResponse(id, {
      tools: [
        {
          name: "get_current_time",
          description:
            "Returns the exact current system time. Call this whenever you need to know what time it is right now — especially after the user comes back from a break, at session start, or before any time-sensitive task.",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "get_time_elapsed",
          description:
            "Calculates exactly how much time has passed since a given timestamp. Use this to tell the user how long they were away, or how long a task took.",
          inputSchema: {
            type: "object",
            properties: {
              since_timestamp_ms: {
                type: "number",
                description: "The timestamp_ms value from a previous get_current_time call",
              },
            },
            required: ["since_timestamp_ms"],
          },
        },
        {
          name: "get_session_info",
          description:
            "Returns when this Claude Code session started and how long it has been running. Useful for session-level time tracking.",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    });
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params;
    let result;

    if (name === "get_current_time") result = getCurrentTime();
    else if (name === "get_time_elapsed") result = getTimeElapsed(args);
    else if (name === "get_session_info") result = getSessionInfo();
    else return sendError(id, -32601, `Unknown tool: ${name}`);

    const isError = result && typeof result === "object" && "__error" in result;
    const payload = isError ? { error: result.__error } : result;

    return sendResponse(id, {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      isError,
    });
  }

  // Ignore notifications (no id)
  if (id !== undefined) {
    sendError(id, -32601, `Method not found: ${method}`);
  }
}

// --- stdio Transport (newline-delimited JSON) ---

let buffer = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    try {
      handleRequest(JSON.parse(line));
    } catch (e) {
      // Malformed JSON, skip
    }
  }
});

process.stdin.on("end", () => process.exit(0));
