# Claude Clock

Gives Claude Code real-time awareness of your system time — permanently.

## The problem it solves

Claude Code has zero time awareness by default. You send a message at 12pm, go for lunch, come back at 3pm and type something — Claude still thinks it's 12pm. It has no idea how long you were gone.

Claude Clock fixes this completely.

## How it works

Three components work together:

### 1. MCP Server (`~/.claude-clock/server.js`)
A lightweight server that exposes your system clock to Claude Code as callable tools:
- `get_current_time` — returns exact current time, date, timezone
- `get_time_elapsed` — calculates how long since a given timestamp
- `get_session_info` — returns when the session started and how long it's been running

### 2. SessionStart Hook (`~/.claude-clock/hooks/session-start.js`)
Fires once when Claude Code starts or resumes. Immediately injects the current time into Claude's context, so it knows what time it is before you even type anything.

### 3. UserPromptSubmit Hook (`~/.claude-clock/hooks/user-prompt-submit.js`)
Fires on **every message you send**. Appends an exact timestamp to your message context. This is what makes it know you came back at 3pm — the moment you type, it stamps the time.

## Requirements

- macOS or Linux (Windows users: run inside WSL)
- [Node.js](https://nodejs.org/) on your `PATH`
- [Claude Code](https://claude.com/claude-code) installed (`claude` CLI available)
- `jq` (optional, but recommended — used to safely merge hooks into an existing `~/.claude/settings.json`)

## Install

```bash
git clone https://github.com/francis-codex/claude-clock.git
cd claude-clock
bash setup.sh
```

That's it. One command. The script is idempotent — safe to re-run.

## Manual MCP registration (if setup.sh MCP step fails)

```bash
claude mcp add claude-clock -s user -- node "$HOME/.claude-clock/server.js"
```

## Test it

Open Claude Code and ask:
- *"What time is it?"*
- *"How long has this session been running?"*
- *"What time did I send my last message?"*

## File structure after install

```
~/.claude-clock/
├── server.js                  # MCP server
└── hooks/
    ├── session-start.js       # SessionStart hook
    └── user-prompt-submit.js  # UserPromptSubmit hook

~/.claude/
└── settings.json              # Hook configuration (points to above)
```

Claude Code MCP registration is stored internally by Claude Code when you run `claude mcp add`.

## License

[MIT](./LICENSE)
