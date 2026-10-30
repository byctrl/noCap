# Linux (x86_64) build

`scripts/build-desktop-linux.sh` produces the self-contained Linux packages. It is
the Linux counterpart of `scripts/build-desktop.sh`; the macOS and Windows builds
are unchanged.

```bash
bash scripts/build-desktop-linux.sh
```

Run it on an x86_64 Linux host (Ubuntu 22.04 is a sensible baseline). PyInstaller
cannot cross-compile, so the backend — and therefore the package — can only be
built on Linux.

## Output

`frontend/dist-app/`:

| File | Notes |
| --- | --- |
| `noCap-<version>-x86_64.AppImage` | Single-file, no install needed |
| `nocap_<version>_amd64.deb` | For Debian/Ubuntu installs |

## What is bundled

Same runtime payload as the macOS/Windows builds, via the shared
`extraResources` in `frontend/electron-builder.yml`:

- `backend/nocap-server/` — PyInstaller `onedir` bundle: Python, the noCap
  backend, Whisper and Demucs. `frontend/electron/backend.ts` launches
  `Resources/backend/nocap-server/nocap-server` and points `NOCAP_RESOURCES` at
  `Resources/`, which works as-is on Linux.
- `whisper_models/medium.en.pt` — Whisper weights.
- `demucs_models/checkpoints/*.th` — Demucs weight(s).

Nothing needs to be installed on the target machine.

## Size

Torch is installed from `https://download.pytorch.org/whl/cpu`, so the package
carries no CUDA libraries. On a machine with an NVIDIA GPU the backend still uses
CUDA when the system provides it; the bundle itself stays CPU-only.

Expected download sizes (CPU-only torch, `medium.en`, `htdemucs`):

- AppImage: roughly 1.5–2.0 GB (squashfs of ~2.5 GB installed)
- deb: similar, xz-compressed

GitHub release assets are limited to **2 GB per file**. If an artifact comes out
above that, do not ship it as a single asset: build the unpacked folder instead
and split it into parts, mirroring the Windows build:

```bash
cd frontend
exec npx electron-builder --linux dir --x64 --publish never
# then split dist-app/linux-unpacked/ into <2 GB parts (e.g. 7z -v1900m)
```

## Runtime data

User data lives in `$XDG_DATA_HOME/noCap` (`~/.local/share/noCap` by default);
see `nocap/library/paths.py`. It is not part of the bundle.

## Acceptance checklist

On a clean Ubuntu VM (no Python, no CUDA):

1. Run the AppImage (or `sudo apt install ./nocap_<version>_amd64.deb` and launch
   `noCap` from the menu).
2. The window opens and the backend starts on port 5757 — no Python/venv on the
   machine is used.
3. `NOCAP_RESOURCES` resolves: Whisper loads `medium.en` from
   `Resources/whisper_models/` rather than downloading.
4. Analyse a track end to end (transcription + stem separation) and confirm the
   Demucs weights load from `Resources/demucs_models/checkpoints/`.
5. Confirm results are written under `~/.local/share/noCap`.
