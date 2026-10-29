#!/bin/bash
# Start einer Cloud-Sitzung: Abhängigkeiten installieren und den Wissensgraphen des Codes bauen
# (Graphify, nur Code über tree-sitter, ohne KI-Modell, siehe CLAUDE.md). Lokal passiert nichts.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
export PATH="$HOME/.local/bin:$PATH"
echo "export PATH=\"$HOME/.local/bin:\$PATH\"" >> "${CLAUDE_ENV_FILE:-/dev/null}"

# npm-Pakete für Build und Tests (npm install nutzt den Zwischenspeicher des Containers)
npm install --no-audit --no-fund --loglevel=error

# Graphify installieren, falls es fehlt (offizielles Paket heißt graphifyy)
if ! command -v graphify >/dev/null 2>&1; then
  if command -v uv >/dev/null 2>&1; then
    uv tool install --quiet "graphifyy[sql]"
  else
    python3 -m pip install --user --quiet "graphifyy[sql]"
  fi
fi

# Graph neu bauen (graphify-out/ steht in .gitignore); ein Fehler hier hält die Sitzung nicht auf
GRAPHIFY_QUERY_LOG_DISABLE=1 graphify update . >/dev/null 2>&1 || echo "graphify update fehlgeschlagen" >&2
