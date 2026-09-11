# 🔍 Manual Test: URL Hash Auto-Login

## Scenario: User mengakses dashboard via `http://localhost:2886/#key=API_KEY`

### Expected Behavior:
1. Browser opens `http://localhost:2886/#key=owa_k1_...`
2. Login.tsx reads hash on mount → extracts API key
3. Form auto-fills with extracted API key
4. Submit form → Auto-login successful
5. Redirected to sessions page

### Current Status:
- ✅ `apiKeyStore.getApiKey()` function exists and handles hash
- ✅ `Login.tsx` updated to call `getApiKey()` on state initialization  
- ✅ `openwa-server/dashboard/dist/` rebuilt with new code
- ✅ Links in Main App updated to include `#key=` in href

### To Verify (Manual Steps):

1. Start dev server: `npm run dev` (or restart if already running)

2. From `/admin/whatsapp?tab=setup`:
   - Click "Dashboard Auto-Login" button
   - New tab opens: `http://localhost:2886/#key=YOUR_API_KEY`

3. **Check Browser Console (F12)**:
   - Should see: "Auto-detected API key from hash" (if logging added)
   - No errors about hash parsing

4. **Verify Form State**:
   - API Key field should be filled automatically
   - Submit button should work without typing

5. **Expected Flow**:
   ```
   Load → readHashKey() → extract apiKey → populate form → submit → login success
   ```

### If Still Requires Manual Input:

Possible causes:
1. ❌ Browser cache not cleared
   - Solution: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

2. ❌ Dashboard not rebuilt after Login.tsx changes
   - Solution: Run `npm run build` again in openwa-server/dashboard/

3. ❌ HASH_PARAM constant changed but app uses old param name
   - Check: `const HASH_PARAM = 'key';` in apiKeyStore.ts
   - Link uses: `#key=${apiKey}` ← Match confirmed ✓

4. ❌ getApiKey() exported but not imported in Login.tsx
   - Already verified: import present ✓

### Test Result Template:

```
□ Hash URL generated correctly: http://localhost:2886/#key=xxx
□ Tab opened automatically when clicking "Dashboard Auto-Login"
□ Console shows no errors during load
□ Form field pre-filled with API key
□ Can submit without manual typing
□ Redirected to sessions page after submit
✅ ALL CHECKS PASSED
```
