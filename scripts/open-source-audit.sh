#!/usr/bin/env bash
# =============================================================================
# 学事智办 · Open Source Security Audit Script (Bash)
# =============================================================================
set -e

echo "=================================================="
echo "  Running Open Source Preflight Security Audit   "
echo "=================================================="

ERROR_COUNT=0

# 1. Tracked sensitive files
echo -e "
[1/5] Checking for tracked sensitive environment and key files..."
TRACKED_SENSITIVE=$(git ls-files | grep -E "(\.env$|\.pem$|\.key$|\.pfx$|\.har$)" || true)
if [ -n "$TRACKED_SENSITIVE" ]; then
    echo "  [FAIL] Found tracked sensitive files:"
    echo "$TRACKED_SENSITIVE"
    ERROR_COUNT=$((ERROR_COUNT + 1))
else
    echo "  [PASS] No tracked .env, .pem, .key, or .har files."
fi

# 2. Secret scan
echo -e "
[2/5] Scanning for hardcoded API keys & private key headers..."
SECRET_HITS=$(git grep -I -i -E "(-----BEGIN [A-Z ]*PRIVATE KEY-----|AKID[a-zA-Z0-9]{16,}|ghp_[a-zA-Z0-9]{36,})" || true)
if [ -n "$SECRET_HITS" ]; then
    echo "  [FAIL] Found suspicious secret pattern hits:"
    echo "$SECRET_HITS"
    ERROR_COUNT=$((ERROR_COUNT + 1))
else
    echo "  [PASS] No high-risk secret patterns found."
fi

# 3. Phone numbers
echo -e "
[3/5] Scanning for unmasked phone numbers..."
PHONE_HITS=$(git grep -I -E "1[3-9][0-9]{9}" -- ":!*.log" ":!scratch/*" || true)
if [ -n "$PHONE_HITS" ]; then
    echo "  [FAIL] Found potential phone number patterns:"
    echo "$PHONE_HITS"
    ERROR_COUNT=$((ERROR_COUNT + 1))
else
    echo "  [PASS] No unmasked phone numbers found in tracked files."
fi

# 4. Node tests
echo -e "
[4/5] Running Node.js test suite..."
node --test external_mock_api/test/*.test.mjs || ERROR_COUNT=$((ERROR_COUNT + 1))

# 5. Python tests
echo -e "
[5/5] Running Python backend test suite..."
python3 mock_api/test_server.py || ERROR_COUNT=$((ERROR_COUNT + 1))

echo "=================================================="
if [ $ERROR_COUNT -eq 0 ]; then
    echo "  AUDIT STATUS: ALL CHECKS PASSED (READY)"
else
    echo "  AUDIT STATUS: $ERROR_COUNT CHECKS FAILED"
    exit 1
fi
echo "=================================================="
