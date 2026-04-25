# ============================================================
#  HECHOAPP — Script de Deploy a Produccion
#  Ejecutar desde: f:\HECHOAPP  en PowerShell
#  Fecha: 2026-04-15
# ============================================================

$ErrorActionPreference = "Stop"
$host.UI.RawUI.WindowTitle = "HECHOAPP Deploy"

function Write-Step($num, $msg) {
    Write-Host "`n[$num] $msg" -ForegroundColor Cyan
    Write-Host ("-" * 50) -ForegroundColor DarkGray
}

function Write-OK($msg) { Write-Host "  OK  $msg" -ForegroundColor Green }
function Write-ERR($msg) { Write-Host "  ERR $msg" -ForegroundColor Red }
function Write-WARN($msg) { Write-Host "  !   $msg" -ForegroundColor Yellow }

Write-Host ""
Write-Host "================================================" -ForegroundColor Magenta
Write-Host "   HECHOAPP  -  DEPLOY A PRODUCCION            " -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta

# ── PASO 1: Verificacion de seguridad ────────────────────────────────────────
Write-Step "1/5" "Verificacion de archivos sensibles"

$dangerFiles = @(".env.local", "temp-service-key.json", "vertex-error.log")
foreach ($f in $dangerFiles) {
    $tracked = (git ls-files $f 2>$null)
    if ($tracked -and $tracked.Trim() -ne "") {
        Write-WARN "$f esta siendo rastreado por git. Removiendo del indice (el archivo local se conserva)..."
        git rm --cached $f 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-OK "$f removido del tracking de git correctamente."
        }
        else {
            Write-ERR "No se pudo remover $f del indice. Ejecuta manualmente: git rm --cached $f"
            exit 1
        }
    }
}
Write-OK "Sin archivos sensibles en git."

# ── PASO 2: Build de produccion ───────────────────────────────────────────────
Write-Step "2/5" "npm run build (next build --webpack)"

# Limpiar procesos node y directorio .next bloqueado
Write-Host "  Liberando procesos Node.js..." -ForegroundColor Gray
$ErrorActionPreference = "SilentlyContinue"
taskkill /F /IM node.exe 2>&1 | Out-Null
$ErrorActionPreference = "Stop"
Start-Sleep -Seconds 1

if (Test-Path ".\.next") {
    Write-Host "  Limpiando directorio .next anterior..." -ForegroundColor Gray
    Remove-Item -Recurse -Force ".\.next" -ErrorAction SilentlyContinue
}
Write-OK "Entorno limpio. Iniciando build..."
Write-WARN "Esto puede tardar 3-7 minutos. No cierres la ventana..."

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-ERR "BUILD FALLIDO. Revisa los errores arriba (pueden ser TypeScript o de compilacion)."
    exit 1
}
Write-OK "Build de produccion exitoso!"

# ── PASO 3: Git commit y push ─────────────────────────────────────────────────
Write-Step "3/5" "Git: add, commit y push"

git add -A
Write-Host ""
Write-Host "Archivos que van en este commit:" -ForegroundColor White
git status --short
Write-Host ""

$fecha = Get-Date -Format "yyyy-MM-dd"
$mensaje = "feat: production deploy $fecha - HVAC + Checkout + AI + ERPNext + Notifications + RBAC Firestore rules"

Write-WARN "Mensaje del commit: $mensaje"
$ok = Read-Host "Confirmar commit y push? (s/n)"
if ($ok -ne "s") {
    Write-WARN "Cancelado por el usuario. No se hizo push."
    exit 0
}

git commit -m $mensaje

# Push a master (o main si master falla)
git push origin master
if ($LASTEXITCODE -ne 0) {
    Write-WARN "Push a 'master' fallo. Intentando con 'main'..."
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-ERR "Push fallido. Verifica tu conexion y credenciales de GitHub."
        exit 1
    }
}
Write-OK "Push exitoso! Vercel iniciara el auto-deploy automaticamente."

# ── PASO 4: Firebase Rules ────────────────────────────────────────────────────
Write-Step "4/5" "firebase deploy --only firestore:rules,storage"

firebase deploy --only firestore:rules, storage
if ($LASTEXITCODE -ne 0) {
    Write-WARN "Firebase rules deploy fallo. Puedes reintentarlo manualmente con:"
    Write-Host "  firebase deploy --only firestore:rules" -ForegroundColor Gray
}
else {
    Write-OK "Reglas Firestore + Storage desplegadas!"
}

# ── PASO 5: Firebase Cloud Functions ─────────────────────────────────────────
Write-Step "5/5" "Deploying Cloud Functions"

Set-Location functions

Write-Host "  Instalando dependencias..." -ForegroundColor Gray
npm install --silent

Write-Host "  Compilando TypeScript..." -ForegroundColor Gray
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-ERR "Build de functions fallo. Revisa los errores de TS en functions/src/"
    Set-Location ..
    exit 1
}

firebase deploy --only functions
if ($LASTEXITCODE -ne 0) {
    Write-WARN "Deploy de functions fallo. Reintenta con: firebase deploy --only functions"
}
else {
    Write-OK "Cloud Functions desplegadas!"
}

Set-Location ..

# ── RESUMEN FINAL ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "   DEPLOY COMPLETADO" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Vercel (Frontend):" -ForegroundColor White
Write-Host "  -> https://vercel.com/luis-albertis-projects/hechoapp" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Firebase Console (Functions + Rules):" -ForegroundColor White
Write-Host "  -> https://console.firebase.google.com/project/hecho-srl-free" -ForegroundColor Cyan
Write-Host ""
Write-Host "  CHECKLIST POST-DEPLOY:" -ForegroundColor Yellow
Write-Host "  [ ] Login con usuario real funciona" -ForegroundColor Gray
Write-Host "  [ ] Datos de Firestore cargan correctamente" -ForegroundColor Gray
Write-Host "  [ ] Service Worker activo (DevTools > Application)" -ForegroundColor Gray
Write-Host "  [ ] Cloud Functions aparecen en Firebase Console" -ForegroundColor Gray
Write-Host "  [ ] ERPNext bridge funciona (ticket CERRADO -> erpInvoiceId)" -ForegroundColor Gray
Write-Host ""
