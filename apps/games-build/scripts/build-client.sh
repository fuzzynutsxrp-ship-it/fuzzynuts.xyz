#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  build-client.sh — Build Open_RSC_Client.jar
#
#  PLACEHOLDER — executable commands will be added after Open-RSC
#  is cloned on the VPS and the build toolchain is verified.
#
#  Expected workflow (verified against Open-RSC develop branch):
#    1. cd /opt/openrsc
#    2. ./Start-Linux.sh  →  select option 1 (compile + start)
#       This uses Gradle to build server + client JARs
#    3. Copy client JAR to apps/games-build/client-dist/
#    4. Generate SHA256 checksum
#
#  Prerequisites:
#    - Java JDK 8+ installed (OpenJDK recommended)
#    - MariaDB installed and configured (see .env)
#    - Open-RSC source cloned at /opt/openrsc/
#
#  Build system: Gradle (NOT Ant)
#  Config format: Tab-indented YAML (NOT Java properties)
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

echo "=== Open-RSC Client Build ==="
echo ""
echo "This is a placeholder script. Before running:"
echo "  1. Clone Open-RSC: git clone https://gitlab.com/openrsc/openrsc.git /opt/openrsc"
echo "  2. Install Java 8+: sudo apt install openjdk-11-jdk"
echo "  3. Install MariaDB: sudo apt install mariadb-server"
echo "  4. Configure .env with database credentials"
echo "  5. Verify paths below match your Open-RSC version"
echo ""

# OPENRSC_DIR="/opt/openrsc"
# CLIENT_DIR="${OPENRSC_DIR}/PC_Client"
# OUTPUT_DIR="$(dirname "$0")/../client-dist"

# echo "[1/3] Building client via Gradle..."
# cd "$OPENRSC_DIR"
# ./gradlew :PC_Client:build

# echo "[2/3] Copying JAR..."
# cp "${CLIENT_DIR}/build/libs/"*.jar "${OUTPUT_DIR}/Open_RSC_Client.jar"

# echo "[3/3] Generating checksum..."
# cd "$OUTPUT_DIR"
# sha256sum Open_RSC_Client.jar > Open_RSC_Client.jar.sha256

# echo ""
# echo "Build complete. JAR at: ${OUTPUT_DIR}/Open_RSC_Client.jar"
# echo "Checksum at: ${OUTPUT_DIR}/Open_RSC_Client.jar.sha256"
