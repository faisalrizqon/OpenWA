# 📱 OpenWA WhatsApp Integration for MudahSewa

Dokumentasi lengkap implementasi WhatsApp Business API menggunakan OpenWA (whatsapp-web.js).

---

## ⚠️ PENTING: BACA SEBELUM IMPLEMENTASI

### **Risiko Akun Restriction/Ban**
OpenWA menggunakan unofficial WhatsApp client, bukan official Meta Cloud API. Ini berarti:
- ⚠️ **Ada risiko akun diblokir oleh WhatsApp**
- ✅ **Gunakan dedicated phone number** (bukan nomor pribadi utama)
- ✅ **Jangan blast spam atau bulk messaging ke陌生人**
- ✅ **Warm-up nomor minimal 7 hari sebelum usage berat**

### **Engine Pilihan**
```
whatsapp-web.js = Lower ban risk, High RAM (~500MB/session)
baileys         = Higher ban risk, Low RAM (~50MB/session)
```

**Rekomendasi:** Gunakan `whatsapp-web.js` untuk production karena lebih aman terhadap ban.

---

## 🏗️ ARSITEKTUR SISTEM

```
┌─────────────────────────────────────────────────────────────┐
│                     MudahSewa Next.js                        │
│  (Order notifications, payment reminders, admin actions)    │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP Events & Triggers
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              WhatsApp Service Layer                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Client Manager     Session lifecycle management   │   │
│  │  - Initialize session                             │   │
│  │  - QR code generation                              │   │
│  │  - Connection monitoring                           │   │
│  └────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Webhook Handler    Incoming message processing    │   │
│  │  - Auto-reply templates                            │   │
│  │  - Order automation                                │   │
│  │  - Admin routing                                   │   │
│  └────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Order Triggers     Automated notifications        │   │
│  │  - Booking confirmed                               │   │
│  │  - Payment reminders                              │   │
│  │  - Return alerts                                  │   │
│  │  - Late fees                                      │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │ WhatsApp Protocol (Headless Chrome)
                      ▼
            [QR Code Scanning]
                      ▼
           📱 Dedicated WhatsApp Number
```

---

## 📦 FILE STRUCTURE

```
src/services/whatsapp/
├── client-manager.ts          # Core WhatsApp session management
├── webhook-handler.ts         # Incoming message handling  
├── order-trigger.ts          # Order lifecycle notifications
└── index.ts                   # Public API export

openwa-data/
├── sessions.db               # SQLite session database
└── media/                    # Media file storage

.env.openwa                     # Configuration file
WHATSAPP_INTEGRATION.md         # This documentation
```

---

## 🚀 INSTALASI & SETUP

### **Step 1: Environment Variables**

File `.env.openwa` sudah tersedia dengan konfigurasi default:

```bash
# Edit sesuai kebutuhan:
WHATSAPP_SESSION_NAME="MudahSewa-Support"
WHATSAPP_PHONE_NUMBER="+6281234567890"  # CHANGE THIS TO YOUR NUMBER
WEBHOOK_URL="http://localhost:3000/api/webhooks/whatsapp"
RATE_LIMIT_MESSAGES_PER_MINUTE=20        # Safety limit
```

### **Step 2: Initialize Service**

```bash
# Start development server with WhatsApp service
npm run openwa:dev

# Or start as background worker
npm run openwa:start
```

Output akan menampilkan:
```
[session_xxx] Initializing WhatsApp session...
[session_xxx] Using whatsapp-web.js engine...
[session_xxx] QR Code received:
[paste here the QR code or image data]
```

### **Step 3: Scan QR Code**

1. Buka WhatsApp di HP Anda
2. Tap menu (⋮) → Linked Devices
3. Tap "Link a Device"
4. Scan QR code dari console/browser

Wait for:
```
[session_xxx] Authenticated!
[session_xxx] Client ready!
```

Session now active dan siap kirim pesan!

---

## 🎯 USE CASES YANG TERINTEGRASI

### **1. Order Confirmation (New Booking)**
Trigger: `NotificationTriggers.onOrderCreated(orderId)`
```typescript
// Triggered when customer completes checkout
await NotificationTriggers.onOrderCreated(newOrderId);
// Result: WhatsApp message with order details sent to customer
```

### **2. Payment Reminders**
Trigger: `NotificationTriggers.onPaymentDue(orderId)`
```typescript
// Called daily via cron job
setInterval(() => {
  const pendingOrders = await getPendingPaymentOrders();
  pendingOrders.forEach(onPaymentDue);
}, 24 * 60 * 60 * 1000);
```

### **3. Return Reminders**
Trigger: `NotificationTriggers.onReturnReminder(orderId)`
```typescript
// Scheduled automatically 2 days before endDate
async function scheduleReturnReminders() {
  const orders = await prisma.order.findMany({
    where: {
      status: 'active',
      endDate: { gte: new Date(Date.now() + 2*24*60*60*1000) }
    }
  });
  
  for (const order of orders) {
    if (!order.returnReminderSent) {
      await sendReturnReminder(order.id);
      await prisma.order.update({ 
        where: { id: order.id }, 
        data: { returnReminderSent: true } 
      });
    }
  }
}
```

### **4. Late Fee Notifications**
Trigger: `NotificationTriggers.onLateFeeAdded(orderId, amount)`
```typescript
// When order exceeds endDate and late fee is applied
await NotificationTriggers.onLateFeeAdded(lateOrderId, lateAmount);
```

### **5. Customer Inquiry Handling**
Incoming messages are processed by `WhatsAppWebhookHandler`:
- `/menu`, `/help`, `?` → Menu response
- `/status`, `/cek`, `/check` → Order status lookup
- `/catalog`, `/produk`, `/katalog` → Catalog link
- Default → Route to admin dashboard

---

## 🔧 ADMIN DASHBOARD FEATURES

### **Dashboard UI Components (Coming Soon)**
```
/src/app/admin/whatsapp/
├── page.tsx              # Main WhatsApp management page
├── components/
│   ├── SessionStatus.tsx # Live connection status
│   ├── MessageHistory.tsx# Chat history viewer
│   ├── QuickSend.tsx     # Manual message sender
│   └── ConfigPanel.tsx   # Settings & rate limits
```

### **Features:**
- ✅ View all connected sessions
- ✅ Monitor connection health
- ✅ Send manual messages
- ✅ View message delivery status
- ✅ Block specific numbers (safety)
- ✅ Configure rate limits
- ✅ Export chat logs

---

## 🛡️ SAFETY & BEST PRACTICES

### **Daily Guidelines**

1. **Morning Routine**
   - Check session health in dashboard
   - Review overnight automated messages
   - Respond to any unanswered inquiries

2. **Message Sending**
   - Maximum 20 messages/minute (configurable)
   - Avoid cold outreach to strangers
   - Personalize messages when possible

3. **Account Health**
   - Use only for opted-in customers
   - Don't mass-message non-contacts
   - Respect opt-out requests immediately

### **Warming Up New Numbers**

**Week 1 (Setup Days):**
```
Day 1-2: Only test messages to own contacts
Day 3-4: Connect to existing customer database (opt-in first!)
Day 5-7: Gradual increase, monitor delivery rates
```

**Success Metrics:**
- ✅ Delivery rate > 80%
- ✅ Response rate from customers
- ✅ No "blocked" or "restricted" warnings

### **When to Switch to Official API**

Consider upgrading to WhatsApp Business Cloud API if:
- Need guaranteed delivery for critical notifications
- Scale > 10,000 messages/day consistently
- Compliance requirements (GDPR, healthcare, finance)
- Budget allows for official API costs

---

## 📊 MONITORING & METRICS

### **Health Checks**
```typescript
// Add to monitoring script
const metrics = {
  activeSessions: whatsappClientManager.getAllSessions().filter(s => s.isConnected).length,
  messagesToday: await countMessagesSentToday(),
  failedMessages: await countFailedMessagesToday(),
  incomingMessages: await countIncomingMessagesToday()
};

if (metrics.activeSessions === 0) {
  throw new Error('All sessions disconnected!');
}

if (metrics.failedMessages > metrics.messagesToday * 0.1) {
  throw new Error('High failure rate detected!');
}
```

### **Alerts Setup**
Set up alerts for:
- Session disconnection
- Rate limit hitting frequently
- Error rates > 10%
- First-time message failures > 50%

---

## 🔄 MAINTENANCE SCHEDULE

### **Weekly Tasks**
- ✅ Rotate QR codes every 30 days (security best practice)
- ✅ Backup session data (`openwa-data/sessions.db`)
- ✅ Review blocked/restricted numbers
- ✅ Analyze message delivery stats

### **Monthly Tasks**
- ✅ Update dependencies (security patches)
- ✅ Review webhook endpoints
- ✅ Clean up old chat history
- ✅ Test full message flow end-to-end

---

## 🆘 TROUBLESHOOTING

### **Common Issues**

| Problem | Solution |
|---------|----------|
| QR code not appearing | Check puppeteer dependency installation |
| "Unable to authenticate" | Network/firewall blocking WhatsApp servers |
| Messages not delivered | First message issue - verified on WhatsApp's side |
| Session disconnects repeatedly | Increase timeout settings |
| Rate limited | Reduce RATE_LIMIT env var temporarily |

### **Debug Mode**
```bash
# Enable debug logging
LOG_LEVEL=debug npm run openwa:dev

# Logs will show detailed protocol interaction
```

---

## 🔐 SECURITY NOTES

1. **Never share API keys or QR codes publicly**
2. **Use environment variables for secrets** (`.env.openwa`)
3. **Implement webhook signature verification**
4. **Rate limit incoming requests**
5. **Backup sessions regularly**
6. **Monitor unusual activity patterns**

---

## 📞 SUPPORT & RESOURCES

### **Documentation**
- [OpenWA GitHub](https://github.com/rmyndharis/OpenWA)
- [whatsapp-web.js Docs](https://docs.whatsappwebjs.dev/)

### **Community**
- Issue tracker: Report bugs
- Discussions: Ask questions

### **Official Migration Path**
When ready for official API:
1. Contact Meta for WhatsApp Business Account approval
2. Setup business verification
3. Migrate phone numbers
4. Replace whatsapp-web.js with official SDK

---

## ✅ CHECKLIST: PRE-LAUNCH

Before using for real customers:

- [ ] Dedicated phone number obtained
- [ ] QR code scanned and session verified
- [ ] Test messages sent/received successfully
- [ ] Order triggers working end-to-end
- [ ] Admin dashboard accessible
- [ ] Monitoring/alerts configured
- [ ] Backup procedure tested
- [ ] Team trained on proper usage
- [ ] Customer consent mechanism in place
- [ ] Opt-out handling implemented

---

**Last Updated:** 2026-08-27  
**Version:** 1.0.0  
**Maintained by:** MudahSewa Development Team
