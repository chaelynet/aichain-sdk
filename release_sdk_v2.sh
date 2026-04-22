#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# ChainMemory SDK v2.0.0 — Release Script
# ═══════════════════════════════════════════════════════════════════
# - Backup del estado actual
# - Reemplaza archivos con v2.0.0
# - Actualiza ABIs desde los contratos deployados
# - Smoke test local (sin transactions)
# - Git commit + tag + push
# - npm publish
# - Verificación post-publish
# ═══════════════════════════════════════════════════════════════════

set -e
set -o pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SDK_DIR="/root/github-sdk"
BACKUP_DIR="/root/github-sdk-backup-$(date +%Y%m%d_%H%M%S)"
NEW_FILES_DIR="/root"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  CHAINMEMORY SDK v2.0.0 — RELEASE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# ───────────────────────────────────────────────────────────────────
# 0. PRE-CHECKS
# ───────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[0/10] Pre-release checks...${NC}"

# Archivos nuevos presentes
REQUIRED_FILES=(
    "sdk_v2_index.js"
    "sdk_v2_package.json"
    "sdk_v2_README.md"
    "sdk_v2_index.d.ts"
    "sdk_v2_examples_basic.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "${NEW_FILES_DIR}/${file}" ]; then
        echo -e "${RED}✗ Falta ${NEW_FILES_DIR}/${file}${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓${NC} Los 5 archivos nuevos están presentes"

# Directorio SDK existe
if [ ! -d "${SDK_DIR}" ]; then
    echo -e "${RED}✗ No se encuentra ${SDK_DIR}${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Directorio SDK existe"

# npm login
NPM_USER=$(npm whoami 2>/dev/null || echo "")
if [ -z "${NPM_USER}" ]; then
    echo -e "${RED}✗ No estás logueado en npm. Ejecutar: npm login${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} npm user: ${NPM_USER}"

# Git status limpio (o solo con los cambios esperados)
cd "${SDK_DIR}"
git remote -v > /dev/null 2>&1 || {
    echo -e "${RED}✗ Git remote no configurado${NC}"
    exit 1
}
echo -e "${GREEN}✓${NC} Git remote OK"

# Version que se va a publicar
NEW_VERSION=$(python3 -c "import json; print(json.load(open('${NEW_FILES_DIR}/sdk_v2_package.json'))['version'])")
CURRENT_PUBLISHED=$(npm view chainmemory-sdk version 2>/dev/null || echo "none")
echo -e "${GREEN}✓${NC} Version actual en npm: ${CURRENT_PUBLISHED}"
echo -e "${GREEN}✓${NC} Version a publicar: ${NEW_VERSION}"

if [ "${CURRENT_PUBLISHED}" = "${NEW_VERSION}" ]; then
    echo -e "${RED}✗ La version ${NEW_VERSION} ya está publicada${NC}"
    echo -e "${YELLOW}  Editar ${NEW_FILES_DIR}/sdk_v2_package.json y bumpear version${NC}"
    exit 1
fi
echo ""

# ───────────────────────────────────────────────────────────────────
# 1. CONFIRMACIÓN
# ───────────────────────────────────────────────────────────────────
echo -e "${YELLOW}Esto hará:${NC}"
echo "  1. Backup completo del SDK actual"
echo "  2. Reemplaza: index.js, package.json, README.md"
echo "  3. Agrega: index.d.ts, examples/basic.js"
echo "  4. Elimina: AICT.json"
echo "  5. Actualiza ABIs desde /root/aichain/deploy/"
echo "  6. npm install (verifica deps)"
echo "  7. Smoke test del SDK"
echo "  8. Git: commit + tag v${NEW_VERSION} + push"
echo "  9. npm publish"
echo " 10. Verificación post-publish"
echo ""
echo -e "${YELLOW}npm publish NO SE PUEDE REVERTIR. Revisá bien antes.${NC}"
echo ""
read -p "Continuar? (SI para proceder): " CONFIRM
if [ "${CONFIRM}" != "SI" ]; then
    echo -e "${RED}Cancelado${NC}"
    exit 0
fi
echo ""

# ───────────────────────────────────────────────────────────────────
# 2. BACKUP
# ───────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[1/10] Backup del SDK actual...${NC}"
cp -r "${SDK_DIR}" "${BACKUP_DIR}"
echo -e "${GREEN}✓${NC} Backup: ${BACKUP_DIR}"
echo ""

# ───────────────────────────────────────────────────────────────────
# 3. REEMPLAZAR ARCHIVOS PRINCIPALES
# ───────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[2/10] Copiando archivos nuevos al SDK...${NC}"

cp "${NEW_FILES_DIR}/sdk_v2_index.js"        "${SDK_DIR}/index.js"
cp "${NEW_FILES_DIR}/sdk_v2_package.json"    "${SDK_DIR}/package.json"
cp "${NEW_FILES_DIR}/sdk_v2_README.md"       "${SDK_DIR}/README.md"
cp "${NEW_FILES_DIR}/sdk_v2_index.d.ts"      "${SDK_DIR}/index.d.ts"

mkdir -p "${SDK_DIR}/examples"
cp "${NEW_FILES_DIR}/sdk_v2_examples_basic.js" "${SDK_DIR}/examples/basic.js"

echo -e "${GREEN}✓${NC} Archivos copiados"
echo ""

# ───────────────────────────────────────────────────────────────────
# 4. ELIMINAR AICT.JSON
# ───────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[3/10] Limpiando archivos obsoletos...${NC}"
if [ -f "${SDK_DIR}/AICT.json" ]; then
    rm "${SDK_DIR}/AICT.json"
    echo -e "${GREEN}✓${NC} AICT.json eliminado"
else
    echo -e "${YELLOW}⚠${NC}  AICT.json no estaba presente"
fi
echo ""

# ───────────────────────────────────────────────────────────────────
# 5. ACTUALIZAR ABIs DESDE CONTRATOS DEPLOYADOS
# ───────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[4/10] Actualizando ABIs desde contratos deployados...${NC}"

DEPLOY_DIR="/root/aichain/deploy"
if [ -f "${DEPLOY_DIR}/AIMemoryRegistry.json" ]; then
    cp "${DEPLOY_DIR}/AIMemoryRegistry.json" "${SDK_DIR}/AIMemoryRegistry.json"
    echo -e "${GREEN}✓${NC} AIMemoryRegistry.json actualizado"
else
    echo -e "${YELLOW}⚠${NC}  No se encontró AIMemoryRegistry.json en deploy dir — manteniendo el actual"
fi

if [ -f "${DEPLOY_DIR}/AIIdentityProtocol.json" ]; then
    cp "${DEPLOY_DIR}/AIIdentityProtocol.json" "${SDK_DIR}/AIIdentityProtocol.json"
    echo -e "${GREEN}✓${NC} AIIdentityProtocol.json actualizado"
else
    echo -e "${YELLOW}⚠${NC}  No se encontró AIIdentityProtocol.json en deploy dir"
fi
echo ""

# ───────────────────────────────────────────────────────────────────
# 6. NPM INSTALL
# ───────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[5/10] Instalando dependencias...${NC}"
cd "${SDK_DIR}"
npm install --silent 2>&1 | tail -5
echo -e "${GREEN}✓${NC} Dependencias instaladas"
echo ""

# ───────────────────────────────────────────────────────────────────
# 7. SMOKE TEST (sin hacer transactions reales)
# ───────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[6/10] Smoke test del SDK...${NC}"

SMOKE_TEST=$(node -e "
const {AICHAIN, CATEGORIES, NETWORKS, ChainMemoryError} = require('./index');

// Test 1: Exports
if (typeof AICHAIN !== 'function') throw new Error('AICHAIN not exported');
if (!Array.isArray(CATEGORIES) || CATEGORIES.length !== 7) throw new Error('CATEGORIES incorrect');
if (!NETWORKS.mainnet) throw new Error('NETWORKS.mainnet missing');
if (NETWORKS.mainnet.chainId !== 202604) throw new Error('chainId mismatch');

// Test 2: Constructor validation
try {
  new AICHAIN({});
  throw new Error('Should fail without privateKey');
} catch(e) {
  if (e.code !== 'MISSING_PRIVATE_KEY') throw new Error('Wrong error code');
}

// Test 3: Constructor with valid config
const ai = new AICHAIN({ privateKey: '0x' + '1'.repeat(64) });
if (ai.network.chainId !== 202604) throw new Error('instance network wrong');

// Test 4: Methods exist
const methods = ['connect','register','remember','decision','learned','interaction','error','milestone','seal','recall','profile','stats','balance','grantAccess','attestTrust','createIdentity'];
for (const m of methods) {
  if (typeof ai[m] !== 'function') throw new Error('Missing method: ' + m);
}

console.log('PASS');
" 2>&1)

if echo "${SMOKE_TEST}" | grep -q "PASS"; then
    echo -e "${GREEN}✓${NC} Smoke test: PASS"
    echo "  - Exports correctos"
    echo "  - Validación de inputs funciona"
    echo "  - 16 métodos públicos disponibles"
else
    echo -e "${RED}✗ Smoke test falló:${NC}"
    echo "${SMOKE_TEST}"
    echo ""
    echo -e "${YELLOW}Rollback:${NC}"
    echo "  rm -rf ${SDK_DIR}"
    echo "  mv ${BACKUP_DIR} ${SDK_DIR}"
    exit 1
fi
echo ""

# ───────────────────────────────────────────────────────────────────
# 8. GIT: COMMIT + TAG + PUSH
# ───────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[7/10] Git: commit + tag + push...${NC}"

cd "${SDK_DIR}"

# Agregar todos los cambios (incluyendo eliminación de AICT.json)
git add -A

# Verificar que hay cambios para commitear
if git diff --cached --quiet; then
    echo -e "${YELLOW}⚠${NC}  No hay cambios para commitear"
else
    git commit -m "v${NEW_VERSION}"
    echo -e "${GREEN}✓${NC} Commit creado: v${NEW_VERSION}"

    # Tag
    git tag -a "v${NEW_VERSION}" -m "v${NEW_VERSION}"
    echo -e "${GREEN}✓${NC} Tag creado: v${NEW_VERSION}"

    # Push
    echo -e "${YELLOW}→ Push a origin/main...${NC}"
    git push origin main 2>&1 | tail -5
    echo -e "${YELLOW}→ Push tags...${NC}"
    git push origin --tags 2>&1 | tail -5
    echo -e "${GREEN}✓${NC} Push completo"
fi
echo ""

# ───────────────────────────────────────────────────────────────────
# 9. NPM PUBLISH
# ───────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[8/10] npm publish...${NC}"
echo ""
echo -e "${YELLOW}ÚLTIMA CONFIRMACIÓN: Se va a publicar chainmemory-sdk@${NEW_VERSION}${NC}"
read -p "Publicar? (PUBLISH para confirmar): " PUB_CONFIRM
if [ "${PUB_CONFIRM}" != "PUBLISH" ]; then
    echo -e "${YELLOW}Publish cancelado. El código ya fue committed y pusheado a git.${NC}"
    echo -e "${YELLOW}Para publicar después: cd ${SDK_DIR} && npm publish${NC}"
    exit 0
fi

cd "${SDK_DIR}"
npm publish 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Publicado a npm"
else
    echo -e "${RED}✗ npm publish falló${NC}"
    exit 1
fi
echo ""

# ───────────────────────────────────────────────────────────────────
# 10. VERIFICACIÓN POST-PUBLISH
# ───────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[9/10] Verificación post-publish...${NC}"

sleep 5  # npm registry tarda un momento en actualizar

PUBLISHED_VERSION=$(npm view chainmemory-sdk version 2>/dev/null)
if [ "${PUBLISHED_VERSION}" = "${NEW_VERSION}" ]; then
    echo -e "${GREEN}✓${NC} npm registry confirma: v${NEW_VERSION}"
else
    echo -e "${YELLOW}⚠${NC}  npm muestra v${PUBLISHED_VERSION} (puede tardar unos minutos en propagarse)"
fi
echo ""

# ───────────────────────────────────────────────────────────────────
# RESUMEN
# ───────────────────────────────────────────────────────────────────
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ SDK v${NEW_VERSION} RELEASED${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Verificar en:${NC}"
echo "  - npm:    https://www.npmjs.com/package/chainmemory-sdk"
echo "  - GitHub: https://github.com/chaelynet/aichain-sdk"
echo ""
echo -e "${BLUE}Test desde otro directorio:${NC}"
echo "  mkdir /tmp/test-sdk && cd /tmp/test-sdk"
echo "  npm init -y && npm install chainmemory-sdk"
echo "  node -e \"console.log(require('chainmemory-sdk').NETWORKS.mainnet.chainId)\""
echo ""
echo -e "${BLUE}Archivos:${NC}"
echo "  - SDK actualizado: ${SDK_DIR}/"
echo "  - Backup original: ${BACKUP_DIR}/"
echo ""
echo -e "${YELLOW}[10/10] Siguiente paso sugerido:${NC}"
echo "  Actualizar chainmemory-mcp para que use la nueva chain"
