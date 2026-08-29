#!/bin/bash
cd /c/Projects/mudahsewa/openwa-server
export NODE_ENV=development
node dist/main.js 2>&1 | tee ../openwa-startup.log &
echo "OpenWA server starting in background..."
sleep 5
curl -s http://localhost:2785/api/health && echo "" || echo "Waiting for server to become ready..."
