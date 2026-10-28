#!/usr/bin/env bash
# Builds a self-contained whisper-server (whisper.cpp) for macOS arm64 with
# Metal shaders embedded, and packages it as the release asset the app's
# optional local Whisper installer downloads.
#
# Usage: scripts/build-whisper-server.sh <whisper.cpp tag> <output dir>
# Example: scripts/build-whisper-server.sh v1.9.5 out
set -euo pipefail

VERSION="${1:?whisper.cpp tag, e.g. v1.9.5}"
OUT_DIR="$(mkdir -p "${2:?output dir}" && cd "$2" && pwd)"
ASSET="whisper-server-${VERSION}-darwin-arm64.tar.gz"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

git clone --depth 1 --branch "$VERSION" \
  https://github.com/ggml-org/whisper.cpp.git "$WORK_DIR/src"

cmake -S "$WORK_DIR/src" -B "$WORK_DIR/build" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=13.3 \
  -DBUILD_SHARED_LIBS=OFF \
  -DGGML_NATIVE=OFF \
  -DGGML_METAL=ON \
  -DGGML_METAL_EMBED_LIBRARY=ON \
  -DGGML_BLAS=ON \
  -DWHISPER_BUILD_EXAMPLES=ON \
  -DWHISPER_BUILD_SERVER=ON \
  -DWHISPER_BUILD_TESTS=OFF \
  -DWHISPER_SDL2=OFF

cmake --build "$WORK_DIR/build" --config Release --target whisper-server \
  -j "$(sysctl -n hw.ncpu)"

STAGE="$WORK_DIR/stage"
mkdir -p "$STAGE"
cp "$WORK_DIR/build/bin/whisper-server" "$STAGE/whisper-server"
cp "$WORK_DIR/src/LICENSE" "$STAGE/LICENSE"

# Must not link anything outside the OS (no @rpath / Homebrew dylibs)
if otool -L "$STAGE/whisper-server" | tail -n +2 | grep -vE '^\s+/(System|usr/lib)/'; then
  echo "whisper-server links non-system libraries" >&2
  exit 1
fi

# Apple Silicon refuses to run unsigned code; make the ad-hoc signature explicit
codesign --force --sign - "$STAGE/whisper-server"
"$STAGE/whisper-server" --help >/dev/null

tar -czf "$OUT_DIR/$ASSET" -C "$STAGE" whisper-server LICENSE
(cd "$OUT_DIR" && shasum -a 256 "$ASSET" > "$ASSET.sha256")
cat "$OUT_DIR/$ASSET.sha256"
