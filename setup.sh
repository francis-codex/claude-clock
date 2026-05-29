#!/bin/bash

# Claude Clock - One-command installer
# Run this once and Claude Code will always know the exact time.

set -e

echo ""
echo "🕐 Claude Clock Setup"
echo "====================="
echo ""

# 1. Install MCP server files to ~/.claude-clock/
echo "→ Installing MCP server..."
mkdir -p ~/.claude-clock/hooks
cp "$(dirname "$0")/mcp-server/index.js" ~/.claude-clock/server.js
cp "$(dirname "$0")/.claude/hooks/session-start.js" ~/.claude-clock/hooks/session-start.js
cp "$(dirname "$0")/.claude/hooks/user-prompt-submit.js" ~/.claude-clock/hooks/user-prompt-submit.js

# Make hooks executable
chmod +x ~/.claude-clock/server.js
chmod +x ~/.claude-clock/hooks/session-start.js
chmod +x ~/.claude-clock/hooks/user-prompt-submit.js

echo "   ✓ Files installed to ~/.claude-clock/"

# 2. Register MCP server with Claude Code (idempotent)
echo ""
echo "→ Registering MCP server with Claude Code..."
if claude mcp list 2>/dev/null | grep -q "^claude-clock:"; then
  echo "   ✓ MCP server already registered (skipping)"
else
  claude mcp add claude-clock -s user -- node "$HOME/.claude-clock/server.js"
  echo "   ✓ MCP server registered"
fi

# 3. Add hooks to global Claude Code settings
echo ""
echo "→ Configuring hooks..."

SETTINGS_FILE="$HOME/.claude/settings.json"
mkdir -p "$HOME/.claude"

# If settings.json doesn't exist, create it fresh
if [ ! -f "$SETTINGS_FILE" ]; then
  cat > "$SETTINGS_FILE" <<'EOF'
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude-clock/hooks/session-start.js"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude-clock/hooks/user-prompt-submit.js"
          }
        ]
      }
    ]
  }
}
EOF
  echo "   ✓ Created ~/.claude/settings.json with hooks"
else
  if command -v jq >/dev/null 2>&1; then
    TMP=$(mktemp)
    # Additive merge: keep any existing hook entries for these events, add ours only if missing.
    jq '
      def ensure_hook($event; $cmd):
        .hooks[$event] = (.hooks[$event] // [])
        | if any(.hooks[$event][]?.hooks[]?; .command == $cmd)
          then .
          else .hooks[$event] += [{ "hooks": [{ "type": "command", "command": $cmd }] }]
          end;
      .hooks = (.hooks // {})
      | ensure_hook("SessionStart"; "node ~/.claude-clock/hooks/session-start.js")
      | ensure_hook("UserPromptSubmit"; "node ~/.claude-clock/hooks/user-prompt-submit.js")
    ' "$SETTINGS_FILE" > "$TMP" && mv "$TMP" "$SETTINGS_FILE"
    echo "   ✓ Hooks merged into existing ~/.claude/settings.json (preserved existing entries)"
  else
    echo ""
    echo "   ⚠️  ~/.claude/settings.json already exists and 'jq' is not installed."
    echo "   Add this manually to the 'hooks' section of that file:"
    echo ""
    cat <<'EOF'
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude-clock/hooks/session-start.js"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude-clock/hooks/user-prompt-submit.js"
          }
        ]
      }
    ]
EOF
  fi
fi

echo ""
echo "✅ Claude Clock installed successfully!"
echo ""
echo "What happens now:"
echo "  • Every time Claude Code starts → it knows the exact current time"
echo "  • Every message you send → Claude sees the exact timestamp"
echo "  • Claude can query get_current_time anytime for live system time"
echo "  • Claude can calculate exactly how long you've been away"
echo ""
echo "Test it: open Claude Code and ask 'what time is it?'"
echo ""
