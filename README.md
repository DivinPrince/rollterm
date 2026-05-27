<br>

<h3 align="center">Terminal screen recorder for demos</h3>

<p align="center">
  Record screen + camera from the CLI, then render polished demo videos automatically.
</p>

<p align="center">
  <a href="https://github.com/DivinPrince/rollterm"><strong>GitHub</strong></a> ·
  <a href="https://www.npmjs.com/package/rollterm"><strong>NPM</strong></a> ·
  <a href="https://github.com/DivinPrince"><strong>Author</strong></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/rollterm"><img src="https://img.shields.io/npm/v/rollterm?style=flat-square&color=333" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/rollterm"><img src="https://img.shields.io/npm/l/rollterm?style=flat-square&color=333" alt="License"></a>
  <a href="https://www.npmjs.com/package/rollterm"><img src="https://img.shields.io/npm/dt/rollterm?style=flat-square&color=333" alt="npm downloads"></a>
</p>

---

## What is rollterm?

rollterm is a lightweight CLI for recording terminal demos. Run `rollterm record` and it captures your screen, camera, and mic — then composites everything onto a macOS wallpaper with rounded bubbles and shadows.

Helps with shipping polished demo videos without opening Screen Studio or dragging clips into an editor.

It is not a full video editor. rollterm records raw tracks, renders a finished export automatically, and lets you re-render anytime with different wallpaper or layout settings.

## Install

```sh
bun i -g rollterm
rollterm devices
```

Install [ffmpeg](https://formulae.brew.sh/formula/ffmpeg) for reliable macOS screen capture:

```sh
brew install ffmpeg
```

> Requires [Bun](https://bun.sh) >= 1.1.0. macOS only for now.

## Usage

List devices, then start recording:

```sh
rollterm devices
rollterm record
```

Stop recording:

```sh
# Ctrl+C
```

Press **Ctrl+C** to stop. rollterm renders automatically with a live progress bar. Your finished video lands in `~/Movies/rollterm/<uuid>/rendered.mp4`.

> Allow **Screen Recording** and **Camera** for your terminal app in System Settings → Privacy & Security.

More options:

```sh
rollterm record --wallpaper tahoe-light --padding 40
rollterm record --tracks-only
rollterm render ~/Movies/rollterm/<uuid> --wallpaper sequoia-sunrise
```

## Session layout

Each recording gets a UUID folder under `~/Movies/rollterm/` (macOS) or `~/Videos/rollterm/`:

```
~/Movies/rollterm/<uuid>/
  screen.mp4       # raw screen track
  camera.mp4       # raw camera track
  audio.m4a        # microphone
  rollterm.json    # render config
  rendered.mp4     # polished export
```

Override the root: `export ROLLTERM_OUTPUT_DIR=~/Desktop/demos`

Override ffmpeg: `export ROLLTERM_FFMPEG=/usr/local/bin/ffmpeg`

## Render

Re-render a session with different settings anytime:

Wallpaper presets:

- `sequoia-sunrise` — macOS Sequoia forest
- `tahoe-light` — macOS Tahoe abstract blue

```sh
rollterm render ~/Movies/rollterm/<uuid> --wallpaper sequoia-sunrise
rollterm render ~/Movies/rollterm/<uuid> --wallpaper ~/Pictures/my-bg.png
rollterm render ~/Movies/rollterm/<uuid> --padding 40 --screen-radius 24 --camera-size 240
```

Edit `rollterm.json` in the session folder to tweak layout, then re-run `rollterm render`.
