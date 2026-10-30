#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PYTHON="${PYTHON:-python3}"
VENV="${VENV:-$ROOT/.venv-linux}"
BUILD_DIR="$ROOT/frontend/build"
BACKEND_DIR="$BUILD_DIR/backend"
WHISPER_DIR="$BUILD_DIR/whisper_models"
DEMUCS_DIR="$BUILD_DIR/demucs_models/checkpoints"

if [ ! -d "$VENV" ]; then
  "$PYTHON" -m venv "$VENV"
fi
# shellcheck disable=SC1091
source "$VENV/bin/activate"

python -m pip install --upgrade pip
python -m pip install -e .
python -m pip install --force-reinstall --index-url https://download.pytorch.org/whl/cpu torch torchaudio
python -m pip install pyinstaller

rm -rf "$BUILD_DIR/backend" "$BUILD_DIR/whisper_models" "$BUILD_DIR/demucs_models"
mkdir -p "$BACKEND_DIR" "$WHISPER_DIR" "$DEMUCS_DIR"

# Build the backend on Linux; PyInstaller only targets the host OS.
python -m PyInstaller \
  --noconfirm \
  --clean \
  --onedir \
  --name nocap-server \
  --distpath "$ROOT/build/pyinstaller-dist" \
  --workpath "$ROOT/build/pyinstaller-work" \
  --specpath "$ROOT/build/pyinstaller-spec" \
  --paths "$ROOT" \
  --collect-all nocap \
  "$ROOT/nocap/web/desktop.py"

cp -a "$ROOT/build/pyinstaller-dist/nocap-server" "$BACKEND_DIR/"

# Bundle Whisper medium.en into the app resources.
WHISPER_BUILD_DIR="$WHISPER_DIR" python - <<'PY'
import os
import whisper
whisper.load_model('medium.en', download_root=os.environ['WHISPER_BUILD_DIR'])
PY

# Bundle Demucs weights (torch.hub layout) into the app resources.
python - <<'PY'
from demucs.pretrained import get_model
get_model('htdemucs')
PY
shopt -s nullglob
for f in "$HOME"/.cache/torch/hub/checkpoints/*.th; do
  cp -v "$f" "$DEMUCS_DIR/"
done
shopt -u nullglob
if [ -z "$(find "$DEMUCS_DIR" -maxdepth 1 -name '*.th' -print -quit)" ]; then
  echo 'No Demucs .th weights were found in the torch hub cache.' >&2
  exit 1
fi

cd "$ROOT/frontend"
npm ci
npm run build
if node -e "process.exit(require('./package.json').scripts['build:desktop'] ? 0 : 1)"; then
  npm run build:desktop
fi
npx electron-builder --linux AppImage --x64 --config electron-builder.yml
