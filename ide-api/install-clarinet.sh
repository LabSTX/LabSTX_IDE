#!/bin/bash
# api/install-clarinet.sh
# Standalone installer for the API folder

set -e

ARCH=$(uname -m)
OS=$(uname -s)
CLARINET_VERSION="v2.11.0"
BINARY_NAME="clarinet-linux-x64-glibc.tar.gz"

echo "Detected System: $OS ($ARCH)"

if [[ "$OS" != "Linux" ]]; then
  echo "Skipping: This script is for Linux servers (Render/Railway)."
  exit 0
fi

# Determine directory regardless of where script is called from
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
BIN_DIR="$DIR/bin"

if [ -f "$BIN_DIR/clarinet" ]; then
    echo "✅ Clarinet already exists in $BIN_DIR"
    exit 0
fi

mkdir -p "$BIN_DIR"
echo "📥 Downloading Clarinet $CLARINET_VERSION..."
curl -L "https://github.com/hirosystems/clarinet/releases/download/$CLARINET_VERSION/$BINARY_NAME" -o "$DIR/clarinet.tar.gz"

echo "📦 Extracting..."
tar -xzf "$DIR/clarinet.tar.gz" -C "$DIR"
mv "$DIR/clarinet" "$BIN_DIR/"
chmod +x "$BIN_DIR/clarinet"
rm "$DIR/clarinet.tar.gz"

echo "🚀 Clarinet installed successfully to $BIN_DIR/clarinet"
