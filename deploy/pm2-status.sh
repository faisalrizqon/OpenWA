#!/bin/bash
# ============================================================
# MudahSewa PM2 Health Monitor
# Usage: pm2-status.sh [--restart-failed]
# ============================================================

export PATH=/www/server/nodejs/v22.22.3/bin:$PATH
export HOME=/home/www
PM2="sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2"

SERVICES="mudahsewa-app gopay-gateway openwa-server"
PORTS="mudahsewa-app:3000 gopay-gateway:3100 openwa-server:2785"
HEALTH="mudahsewa-app:/ gopay-gateway:/health openwa-server:/api/health"

echo "=== MudahSewa PM2 Services ($(date '+%Y-%m-%d %H:%M:%S')) ==="
$PM2 list

echo ""
echo "=== HTTP Health Checks ==="
for pair in $HEALTH; do
    name="${pair%%:*}"
    path="${pair#*:}"
    port=$(echo "$PORTS" | tr ' ' '\n' | grep "^$name:" | cut -d: -f2)
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://localhost:$port$path" 2>/dev/null)
    if [ "$code" = "200" ] || [ "$code" = "307" ] || [ "$code" = "302" ]; then
        echo "  [OK]   $name -> :$port$path (HTTP $code)"
    else
        echo "  [FAIL] $name -> :$port$path (HTTP ${code:-timeout})"
        if [ "$1" = "--restart-failed" ]; then
            echo "         -> restarting $name..."
            $PM2 restart "$name" >/dev/null 2>&1
        fi
    fi
done

echo ""
echo "=== Failed Service Detection ==="
failed=$($PM2 jlist 2>/dev/null | jq -r '.[] | select(.pm2_env.status != "online") | .name' 2>/dev/null)
if [ -n "$failed" ]; then
    echo "  Stopped/errored services: $failed"
    if [ "$1" = "--restart-failed" ]; then
        for s in $failed; do $PM2 restart "$s" >/dev/null 2>&1; done
        echo "  -> Restarted: $failed"
    fi
else
    echo "  No failures detected"
fi

echo ""
echo "=== Resources ==="
free -h | head -2
df -h / | tail -1
echo ""
echo "=== Disk Usage Alert (>85% = WARNING) ==="
usage=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
[ "$usage" -gt 85 ] && echo "  WARNING: disk ${usage}% used" || echo "  OK: ${usage}% used"
