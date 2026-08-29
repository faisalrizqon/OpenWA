@echo off
echo ========================================
echo OpenWA WhatsApp Gateway Setup
echo ========================================
echo.
echo Step 1: Generate API Key (copy output!)
echo node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
echo.
pause

echo.
echo Step 2: Edit .env file and paste YOUR_KEY_HERE
echo File: E:\Projects\mudahsewa\.env
echo Find: OPENWA_API_KEY=YOUR_GENERATED_KEY_HERE
echo Replace with your generated key above
echo.
pause

echo.
echo Step 3: Clone & install OpenWA
git clone https://github.com/rmyndharis/OpenWA.git openwa-server --depth 1
cd openwa-server
npm install

echo.
echo Step 4: Start server
npm run dev
echo.
echo Server will be available at http://localhost:2785
echo Dashboard available at http://localhost:2886 (if dashboard enabled)
echo.
pause
