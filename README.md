# rollterm

CLI screen recorder for demos — screen + camera, with polished rendering.

## Setup

```bash
git clone https://github.com/DivinPrince/rollterm.git
cd rollterm
bun install
bun link
```

```bash
export PATH="$HOME/.bun/bin:$PATH"
rollterm devices
rollterm record
```

Install [ffmpeg](https://formulae.brew.sh/formula/ffmpeg) for reliable macOS screen capture:

```bash
brew install ffmpeg
```

## macOS permissions

Allow **Screen Recording** and **Camera** for your terminal app in System Settings → Privacy & Security.

## Commands

```bash
rollterm devices
rollterm record
rollterm record --wallpaper tahoe-light --padding 40
rollterm record --tracks-only
rollterm render ~/Movies/rollterm/<uuid>
rollterm render ~/Movies/rollterm/<uuid> --wallpaper sequoia-sunrise
```

Each recording gets a **UUID folder** under `~/Movies/rollterm/` (macOS) or `~/Videos/rollterm/`:

```
~/Movies/rollterm/<uuid>/
  screen.mp4       # raw screen track
  camera.mp4       # raw camera track
  audio.m4a        # microphone
  rollterm.json    # render config
  rendered.mp4     # polished export (auto-created after record)
```

Override the root: `export ROLLTERM_OUTPUT_DIR=~/Desktop/demos`

Override ffmpeg: `export ROLLTERM_FFMPEG=/usr/local/bin/ffmpeg`

Press **Ctrl+C** to stop recording. rollterm renders automatically with a live progress bar and percentage. Use `--tracks-only` to skip render and keep raw tracks only.

## Render

Recording automatically composites your tracks onto a macOS wallpaper with rounded screen + camera bubbles and shadows. Re-render anytime with different settings:

Wallpaper presets:

- `sequoia-sunrise` — macOS Sequoia forest
- `tahoe-light` — macOS Tahoe abstract blue

```bash
rollterm render ~/Movies/rollterm/<uuid> --wallpaper sequoia-sunrise
rollterm render ~/Movies/rollterm/<uuid> --wallpaper ~/Pictures/my-bg.png
rollterm render ~/Movies/rollterm/<uuid> --padding 40 --screen-radius 24 --camera-size 240
```

Edit `rollterm.json` in the session folder to tweak layout, then re-run `rollterm render`.
