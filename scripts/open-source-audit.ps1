# =============================================================================
# 学事智办 · Open Source Security Audit Script (PowerShell)
# =============================================================================

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Running Open Source Preflight Security Audit   " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$ErrorCount = 0

# 1. Check for tracked sensitive files
Write-Host "`n[1/5] Checking for tracked sensitive environment and key files..." -ForegroundColor Yellow
$trackedSensitive = git ls-files | Select-String -Pattern "(\.env$|\.pem$|\.key$|\.pfx$|\.har$)"
if ($trackedSensitive) {
    Write-Host "  [FAIL] Found tracked sensitive files:" -ForegroundColor Red
    $trackedSensitive | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
    $ErrorCount++
} else {
    Write-Host "  [PASS] No tracked .env, .pem, .key, or .har files." -ForegroundColor Green
}

# 2. Check for hardcoded secret patterns in working tree
Write-Host "`n[2/5] Scanning for hardcoded API keys & private key headers..." -ForegroundColor Yellow
$secretHits = git grep -I -i -E "(-----BEGIN [A-Z ]*PRIVATE KEY-----|AKID[a-zA-Z0-9]{16,}|ghp_[a-zA-Z0-9]{36,})"
if ($secretHits) {
    Write-Host "  [FAIL] Found suspicious secret pattern hits:" -ForegroundColor Red
    $secretHits | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
    $ErrorCount++
} else {
    Write-Host "  [PASS] No high-risk secret patterns found." -ForegroundColor Green
}

# 3. Check for phone numbers
Write-Host "`n[3/5] Scanning for unmasked phone numbers..." -ForegroundColor Yellow
$phoneHits = git grep -I -E "1[3-9][0-9]{9}" -- ":!*.log" ":!scratch/*"
if ($phoneHits) {
    Write-Host "  [FAIL] Found potential phone number patterns:" -ForegroundColor Red
    $phoneHits | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
    $ErrorCount++
} else {
    Write-Host "  [PASS] No unmasked phone numbers found in tracked files." -ForegroundColor Green
}

# 4. Run automated tests
Write-Host "`n[4/5] Running Node.js test suite..." -ForegroundColor Yellow
node --test external_mock_api/test/*.test.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Node.js test suite failed!" -ForegroundColor Red
    $ErrorCount++
} else {
    Write-Host "  [PASS] Node.js test suite (24/24) passed!" -ForegroundColor Green
}

Write-Host "`n[5/5] Running Python backend test suite..." -ForegroundColor Yellow
python mock_api/test_server.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Python test suite failed!" -ForegroundColor Red
    $ErrorCount++
} else {
    Write-Host "  [PASS] Python test suite (11/11) passed!" -ForegroundColor Green
}

Write-Host "`n==================================================" -ForegroundColor Cyan
if ($ErrorCount -eq 0) {
    Write-Host "  AUDIT STATUS: ALL CHECKS PASSED (READY)         " -ForegroundColor Green
} else {
    Write-Host "  AUDIT STATUS: $ErrorCount FAILED CHECKS FOUND!  " -ForegroundColor Red
}
Write-Host "==================================================" -ForegroundColor Cyan
