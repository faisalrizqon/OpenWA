# 📱 OpenWA WhatsApp Gateway Setup Guide

## ✅ Quick Start (5 Langkah)

### Step 1: Generate API Key
```bash
cd E:\Projects\mudahsewa
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
✅ **Copy output** (contoh: `a3f8b2c9d4e5f6a1b2c3d4e5f6a7b8c9`)

---

### Step 2: Update .env File
File: `E:\Projects\mudahsewa\.env`

Replace ini:
```bash
OPENWA_API_KEY=YOUR_GENERATED_KEY_HERE
```

Dengan:
```bash
OPENWA_API_KEY=a3f8b2c9d4e5f6a1b2c3d4e5f6a7b8c9... # Paste dari Step 1
```

✅ Edit file dan save!

---

### Step 3: Start OpenWA Server

**Option A: Windows (Double Click)**
```
1. Double click: setup-openwa.bat
2. Follow prompts
3. Server starts automatically
```

**Option B: PowerShell (Manual)**
```powershell
cd E:\Projects\mudahsewa\openwa-server
npm run dev
# Server runs at http://localhost:2785
```

**Option C: Bash (If you have Linux tools)**
```bash
./start-openwa.sh
```

---

### Step 4: Access Dashboard
✅ Open browser → http://localhost:2785  
✅ Or admin panel → http://localhost:3000/admin/whatsapp

---

### Step 5: Scan QR Code
1. Go to EasySewa WhatsApp portal
2. Click "Initialize Session" or "Scan QR"
3. **Open WhatsApp on phone**: 
   - Settings → Linked Devices → Link a Device
   - Scan the QR code from console/browser
4. Wait for "Connected ✓" badge

---

## 🎯 Next Actions

### Test Message Flow
```bash
# Access dashboard at:
http://localhost:3000/admin/whatsapp

# Check Configuration Status:
✅ OPENWA_URL: http://localhost:2785
✓ API Key: Configured
✓ Session ID: session_mudahsewa_support
```

Send test message from dashboard UI → Should appear in recent messages instantly!

---

## ⏰ Warm-up Period (CRITICAL!)

**Day 1-3:** Test messages only (max 10/day)  
**Day 4-6:** Gradual increase (30-50/day)  
**Day 7+:** Full production (>100/day)  

⚠️ **JANGAN BLAST MASSAL sebelum Day 7!** Account bisa dibanned!

---

## 🔧 Troubleshooting

### Server Won't Start?
```bash
cd E:\Projects\mudahsewa\openwa-server
npm install --force  # Reinstall all dependencies
npm run dev          # Try starting again
```

### Can't Access Dashboard?
```bash
curl http://localhost:2785/api/health
# Should return {"status":"healthy"}
```

### QR Code Not Appearing?
1. Stop server
2. Clear sessions: `rm -rf openwa-data/*`
3. Start again and scan fresh QR

---

## 📊 Monitoring

Check logs anytime:
```bash
tail -f E:\Projects\mudahsewa\openwa-startup.log
```

Or check via dashboard at `/admin/whatsapp`

---

## 🆘 Emergency Contacts

- **Account Restricted?** → Stop messaging immediately, appeal to WhatsApp support
- **Low Delivery Rate?** → Reduce rate limits, review message quality
- **Connection Lost?** → Restart server, re-scan QR code

---

## ✨ Success Indicators

✅ Green "Connected ✓" badge  
✅ Messages appear in recent history  
✅ Delivery rate > 80% after warm-up  
✅ All notifications work (booking, payment, etc.)

---

**Need Help?** See [WHATSAPP_INTEGRATION.md](https://github.com/rmyndharis/OpenWA/blob/main/WHATSAPP_INTEGRATION.md) or contact support!
