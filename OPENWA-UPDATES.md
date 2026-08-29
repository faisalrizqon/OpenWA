# 🔄 OpenWA WhatsApp Gateway - Update Guide

## 📌 Summary

OpenWA adalah software yang terus berkembang dengan fitur baru, perbaikan bug, dan peningkatan keamanan. Dokumen ini menjelaskan **cara aman update** tanpa kehilangan sesi atau konfigurasi.

---

## ✅ Keamanan Data

File-file berikut **TIDAK akan terhapus** saat update karena sudah di-configure ke `.gitignore`:

| File | Fungsi | Status Update |
|------|--------|--------------|
| `data/openwa.sqlite` | Database sesi & pesan | 🔒 **Preserved** |
| `data/.api-key` | API key untuk auth | 🔒 **Preserved** |
| `data/.env.generated` | Env auto-generated | 🔒 **Preserved** |
| `media/` | Upload media | 🔒 **Preserved** |

**Kamu tidak perlu backup manual!** Git otomatis preserve semua data penting.

---

## 🆘 Kapan Harus Update?

### ✅ Recommended:
- Ada rilis baru (v0.23.x → v0.24.0)
- Ada security patch dari official
- Ada fitur baru yang dibutuhkan
- Ada bug fix yang relevan dengan usage-mu

### ❌ Not Urgent:
- Minor changes dalam dokumentasi
- Bug fixes yang tidak berdampak padamu
- Fitur experimental yang belum stabil

---

## 🔍 Cara Cek Versi Saat Ini

```bash
cd E:\Projects\mudahsewa\openwa-server
git log --oneline -1        # Last commit
git describe --tags         # Current version tag
npm list openwa             # npm package version (if installed via npm)
```

Contoh output:
```
3b7fbe7e Merge pull request #1461
v0.23.3
```

---

## 🚀 Cara Update (Windows)

### Opsi 1: Automatic Script (Recommended)

1. Double-click file: `update-openwa.bat`
2. Tunggu proses selesai
3. Restart service (lihat instruksi di akhir batch file)

Script akan:
- ✅ Check versi terbaru
- ✅ Backup otomatis (data preserved by git ignore)
- ✅ Pull updates dari GitHub
- ✅ Rebuild if needed
- ✅ Warn jika butuh restart

### Opsi 2: Manual Update

```bash
cd E:\Projects\mudahsewa\openwa-server

# 1. Fetch latest
git fetch --tags

# 2. Check what changed
git log origin/main..HEAD --oneline

# 3. Pull updates (safely merge)
git pull origin main --ff-only

# 4. Rebuild if source changed
npm run build

# 5. Restart service
# Stop current process
killall node  # or kill PID in Task Manager

# Start again
npm start
```

---

## ⏱️ Update Frequency

### Recommendation based on usage:

| Usage Level | Update Schedule | Rationale |
|-------------|-----------------|-----------|
| **Development/Test** | Weekly or per release | Try new features early |
| **Production (Small)** | Monthly or major versions | Balance stability vs features |
| **Production (Critical)** | Quarterly + critical patches | Maximize uptime |
| **Enterprise** | Custom schedule with testing | Need proper QA pipeline |

---

## 🧪 Pre-Update Checklist

Before updating production:

- [ ] Check OpenWA changelog for breaking changes
- [ ] Read migration guides (if any)
- [ ] Backup database manually (just in case)
- [ ] Test on staging first if possible
- [ ] Notify team about maintenance window

---

## 🐛 Troubleshooting Updates

### Problem: "Cannot pull - local modifications"

**Solution:** Stash changes
```bash
git stash
git pull origin main
git stash pop
```

### Problem: "Build failed after pull"

**Solution:** Clean reinstall dependencies
```bash
rm -rf node_modules
npm install
npm run build
```

### Problem: Sessions lost after update?

Check `.gitignore` — if somehow data dir is committed:
```bash
# Restore from git tracked files
git checkout HEAD data/
# Then re-import sessions if needed
```

### Problem: API key missing?

If `.api-key` deleted accidentally:
```bash
# Regenerate by creating new session
curl -X POST http://localhost:2785/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name":"my-session"}'
# Copy response .id as your session ID
```

---

## 📋 Post-Update Checklist

After successful update:

- [ ] Verify service running: `http://localhost:2785/api/health`
- [ ] Check all sessions connected
- [ ] Test message sending
- [ ] Verify webhooks working
- [ ] Review logs for errors
- [ ] Update configuration if new settings added

---

## 🔐 Breaking Changes History

| Version | Breaking Change | Migration Path |
|---------|-----------------|----------------|
| v0.24.0 | N/A (current stable) | None |
| v0.23.0 | Engine switching | Use `WHATSAPP_ENGINE` env var |
| v0.22.0 | Webhook format | See migration guide in docs |

*Always check CHANGELOG.md before major updates!*

---

## 💡 Pro Tips

1. **Set up notification**: Follow GitHub releases to get notified of new versions
2. **Use tags**: Pin to specific version in prod (`v0.23.3`) and upgrade consciously
3. **Maintain changelog**: Track why you updated in project notes
4. **Test thoroughly**: Always test new version against real workflow before production
5. **Monitor closely**: After update, watch logs especially during first 24 hours

---

## 🆘 Emergency Rollback

If new version breaks everything:

```bash
cd E:\Projects\mudahsewa\openwa-server

# Find last good version
git reflog | head -20
# Note the commit hash before update

# Hard reset to previous version
git reset --hard <commit-hash>

# Rebuild
npm run build

# Restart service
```

Data files remain safe throughout this process!

---

## 📞 Support Channels

For update-related issues:

1. Check [OpenWA Changelog](https://github.com/rmyndharis/OpenWA/releases)
2. Search GitHub Issues for similar problems
3. Report bugs at [OpenWA Issues](https://github.com/rmyndharis/OpenWA/issues)
4. Community Discord: [link] (if available)

---

**Last Updated**: 2026-08-27  
**Current Version**: v0.23.3  
**Next Release Expected**: TBD
