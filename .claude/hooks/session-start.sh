#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote ephemeral containers),
# where skills installed to ~/.claude do not persist between sessions.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install the find-skills skill non-interactively for Claude Code.
# Idempotent: re-running simply re-copies the skill.
npx -y skills add vercel-labs/skills --skill find-skills --agent claude-code -g -y
