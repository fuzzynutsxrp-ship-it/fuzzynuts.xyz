#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  patch-rsc-teavm-client.sh — FuzzyNuts wallet auto-login patch
#
#  This script patches the Open-RSC TeaVM client to support auto-login
#  via URL hash parameters (username + password appended after the
#  existing connection params).
#
#  WHAT IT DOES:
#    1. Backs up the original mudclient.java and classes.js
#    2. Adds autoLoginUser / autoLoginPass fields to mudclient.java
#    3. Parses hash params [6]=username, [7]=password in main()
#    4. Auto-fills the login panel and calls login() after game init
#    5. Rebuilds classes.js via Maven + TeaVM
#    6. Deploys the new classes.js to /var/www/rsc-client/teavm/
#
#  IDEMPOTENT: Safe to run twice. Checks if patches are already applied.
#
#  RUN ONCE via DigitalOcean web console (copy-paste entire script):
#    bash /root/patch-rsc-teavm-client.sh
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

SRC_DIR="/var/www/rsc-client/teavm/src"
MUCLIENT_SRC="${SRC_DIR}/mudclient/mudclient.java"
TEAVM_DIR="/var/www/rsc-client/teavm"
BUILD_DIR="/tmp/rsc-teavm-build"
BACKUP_DIR="/var/www/rsc-client/teavm/backup-$(date +%Y%m%d-%H%M%S)"

echo "═══════════════════════════════════════════════════════"
echo " FuzzyNuts RSC TeaVM Auto-Login Patch"
echo "═══════════════════════════════════════════════════════"

# ── Step 0: Check if already patched ──────────────────────────────
if grep -q 'autoLoginUser' "${MUCLIENT_SRC}" 2>/dev/null; then
  echo "✓ Patch already applied (autoLoginUser field found)."
  echo "  Skipping patch. Rebuilding only..."
  ALREADY_PATCHED=true
else
  ALREADY_PATCHED=false
fi

# ── Step 1: Back up originals ─────────────────────────────────────
echo ""
echo "▸ Step 1: Backing up originals..."
mkdir -p "${BACKUP_DIR}"
cp "${MUCLIENT_SRC}" "${BACKUP_DIR}/mudclient.java.orig"
cp "${TEAVM_DIR}/classes.js" "${BACKUP_DIR}/classes.js.orig" 2>/dev/null || true
echo "  Backups at: ${BACKUP_DIR}"

# ── Step 2: Patch mudclient.java ──────────────────────────────────
if [ "${ALREADY_PATCHED}" = false ]; then
  echo ""
  echo "▸ Step 2: Patching mudclient.java..."

  # 2a. Add fields after the existing password field declaration
  #     Target: "String password;" (the last login-related field)
  sed -i '/^   String password;$/a\
   \/\/ FuzzyNuts auto-login fields (injected by patch script)\
   String autoLoginUser;\
   String autoLoginPass;' "${MUCLIENT_SRC}"

  # 2b. Add hash param parsing in main() after the existing 6-param block
  #     Target: the line after "Packet.reenableOpcodeEncryption = false;"
  #     We insert after the closing brace of the webArgs.length > 5 block
  sed -i '/Packet\.reenableOpcodeEncryption = false;/{n;s/\t\t}/\t\t}\n\n\t\t\/\/ FuzzyNuts: parse auto-login credentials from hash params 6 and 7\n\t\tif (webArgs.length > 7) {\n\t\t\tmud.autoLoginUser = webArgs[6];\n\t\t\tmud.autoLoginPass = webArgs[7];\n\t\t}/}' "${MUCLIENT_SRC}"

  # 2c. Add auto-login logic after resetLoginScreenVariables() in startGame()
  #     Target: "this.resetLoginScreenVariables();"
  #     We inject the auto-login block right after it
  sed -i '/this\.resetLoginScreenVariables();$/a\
                           \/\/ FuzzyNuts: auto-login if credentials provided via hash\
                           if (this.autoLoginUser != null \&\& this.autoLoginPass != null \&\& this.autoLoginUser.length() > 0) {\
                              this.loginScreen = 2;\
                              this.panelLoginExistingUser.updateText(this.field_355, this.autoLoginUser);\
                              this.panelLoginExistingUser.updateText(this.field_356, this.autoLoginPass);\
                              this.login(this.autoLoginUser, this.autoLoginPass, false);\
                           }' "${MUCLIENT_SRC}"

  echo "  ✓ Fields, hash parsing, and auto-login logic injected."
else
  echo ""
  echo "▸ Step 2: Skipping patch (already applied)."
fi

# ── Step 3: Set up Maven build directory ──────────────────────────
echo ""
echo "▸ Step 3: Setting up Maven build..."
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}/src/main/java"

# Copy game-specific source trees only (NOT org/ — that's TeaVM internals
# provided by the teavm-classlib Maven dependency, not user code)
cp -r "${SRC_DIR}/mudclient" "${BUILD_DIR}/src/main/java/"
cp -r "${SRC_DIR}/com" "${BUILD_DIR}/src/main/java/"

# Copy pom.xml from META-INF (or create one if missing)
POM_SRC="/var/www/rsc-client/META-INF/maven/2003scape/mudclient/pom.xml"
if [ -f "${POM_SRC}" ]; then
  cp "${POM_SRC}" "${BUILD_DIR}/pom.xml"
else
  echo "  ⚠ pom.xml not found at ${POM_SRC}, creating minimal one..."
  cat > "${BUILD_DIR}/pom.xml" << 'POMEOF'
<project xmlns="http://maven.apache.org/POM/4.0.0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>2003scape</groupId>
  <artifactId>mudclient</artifactId>
  <version>1.0-SNAPSHOT</version>
  <packaging>war</packaging>
  <properties>
    <java.version>1.8</java.version>
    <teavm.version>0.6.1</teavm.version>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.teavm</groupId>
      <artifactId>teavm-classlib</artifactId>
      <version>${teavm.version}</version>
      <scope>provided</scope>
    </dependency>
    <dependency>
      <groupId>org.teavm</groupId>
      <artifactId>teavm-jso-apis</artifactId>
      <version>${teavm.version}</version>
      <scope>provided</scope>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <artifactId>maven-compiler-plugin</artifactId>
        <version>3.1</version>
        <configuration>
          <source>${java.version}</source>
          <target>${java.version}</target>
        </configuration>
      </plugin>
      <plugin>
        <groupId>org.teavm</groupId>
        <artifactId>teavm-maven-plugin</artifactId>
        <version>${teavm.version}</version>
        <executions>
          <execution>
            <id>web-client</id>
            <goals><goal>compile</goal></goals>
            <configuration>
              <targetDirectory>${project.build.directory}/generated/js/teavm</targetDirectory>
              <mainClass>mudclient.mudclient</mainClass>
              <minifying>true</minifying>
              <debugInformationGenerated>true</debugInformationGenerated>
              <sourceMapsGenerated>true</sourceMapsGenerated>
              <sourceFilesCopied>true</sourceFilesCopied>
              <optimizationLevel>FULL</optimizationLevel>
            </configuration>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
POMEOF
fi

echo "  ✓ Build directory ready at ${BUILD_DIR}"

# ── Step 4: Build with Maven + TeaVM ──────────────────────────────
echo ""
echo "▸ Step 4: Building TeaVM client (this takes 1-3 minutes)..."
cd "${BUILD_DIR}"
mvn clean package -q 2>&1 | tail -20

# ── Step 5: Deploy ────────────────────────────────────────────────
echo ""
echo "▸ Step 5: Deploying new classes.js..."
NEW_JS="${BUILD_DIR}/target/generated/js/teavm/classes.js"

if [ ! -f "${NEW_JS}" ]; then
  echo "  ✗ ERROR: Build did not produce classes.js at ${NEW_JS}"
  echo "  Check Maven output above for errors."
  echo "  Original files are backed up at: ${BACKUP_DIR}"
  exit 1
fi

# Deploy
cp "${NEW_JS}" "${TEAVM_DIR}/classes.js"
cp "${BUILD_DIR}/target/generated/js/teavm/classes.js.map" "${TEAVM_DIR}/classes.js.map" 2>/dev/null || true
cp "${BUILD_DIR}/target/generated/js/teavm/classes.js.teavmdbg" "${TEAVM_DIR}/classes.js.teavmdbg" 2>/dev/null || true

echo "  ✓ Deployed new classes.js ($(wc -c < "${TEAVM_DIR}/classes.js") bytes)"

# ── Step 6: Verify ────────────────────────────────────────────────
echo ""
echo "▸ Step 6: Verifying patch..."
if grep -q 'autoLoginUser' "${TEAVM_DIR}/classes.js" 2>/dev/null || \
   grep -q 'autoLogin' "${TEAVM_DIR}/classes.js" 2>/dev/null; then
  echo "  ✓ Auto-login code found in compiled classes.js"
else
  echo "  ⚠ Could not verify auto-login in classes.js (may be minified)."
  echo "  Check manually by loading the game with hash params."
fi

# ── Cleanup ───────────────────────────────────────────────────────
echo ""
echo "▸ Cleaning up build directory..."
rm -rf "${BUILD_DIR}"

echo ""
echo "═══════════════════════════════════════════════════════"
echo " ✓ PATCH COMPLETE"
echo ""
echo " New hash format:"
echo "   #members,host,port,rsa_exp,rsa_mod,true,USERNAME,PASSWORD"
echo ""
echo " Test URL:"
echo "   https://game.fuzzynuts.xyz/#members,game.fuzzynuts.xyz,43494,65537,RSA_MODULUS,true,TestUser,testpass123"
echo ""
echo " Backups at: ${BACKUP_DIR}"
echo " To rollback: cp ${BACKUP_DIR}/classes.js.orig ${TEAVM_DIR}/classes.js"
echo "═══════════════════════════════════════════════════════"
