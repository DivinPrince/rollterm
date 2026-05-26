# rollterm

CLI screen recorder for demos — screen + camera picture-in-picture, built with Bun and ffmpeg.

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
rollterm record -o my-demo.mp4
rollterm merge screen.mp4 camera.mp4 -o final.mp4
```

Each recording gets a **UUID folder** under `~/Movies/rollterm/` (macOS) or `~/Videos/rollterm/`:

```
~/Movies/rollterm/<uuid>/
  screen.mp4
  camera.mp4
  audio.m4a
  output.mp4
```

Override the root: `export ROLLTERM_OUTPUT_DIR=~/Desktop/demos`

Override ffmpeg: `export ROLLTERM_FFMPEG=/usr/local/bin/ffmpeg`

Press **Ctrl+C** to stop; tracks are merged into `output.mp4`.
