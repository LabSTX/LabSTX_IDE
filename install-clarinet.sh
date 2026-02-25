#!/bin/bash
# install-clarinet.sh
# This script downloads the Clarinet binary for Linux systems (Render/Vercel/Railway)

set -e

ARCH=$(uname -m)
OS=$(uname -s)

echo "Detected System: $OS ($ARCH)"

if [[ "$OS" != "Linux" ]]; then
  echo "Skipping Clarinet download: This script is intended for Linux deployment environments (Render/Vercel)."
  echo "On Windows/macOS, please install Clarinet manually using the official installer."
  exit 0
fi

# Determine the binary version to download
CLARINET_VERSION="v2.11.0"
BINARY_NAME="clarinet-linux-x64-glibc.tar.gz"

if [ -f "./bin/clarinet" ]; then
    echo "✅ Clarinet already exists in ./bin"
    exit 0
fi

mkdir -p ./bin
echo "📥 Downloading Clarinet $CLARINET_VERSION..."
curl -L "https://github.com/stx-labs/clarinet/releases/download/$CLARINET_VERSION/$BINARY_NAME" -o clarinet.tar.gz

echo "📦 Extracting..."
tar -xzf clarinet.tar.gz
mv ./clarinet ./bin/
chmod +x ./bin/clarinet
rm clarinet.tar.gz

echo "🚀 Clarinet installed successfully to ./bin/clarinet"
