# Quick Reference: Build & Test

## 🔥 Most Common Commands

### For Development (Hot Reload)
```bash
# 1. Build development APK (do this ONCE)
eas build --profile development --platform android

# 2. Start dev server (do this every time)
npm start

# 3. Scan QR code with "FINEX (Dev)" app
```

### For Production Testing
```bash
# Build production-like preview
eas build --profile preview --platform android
```

### For Store Release
```bash
# Build for Google Play Store
eas build --profile production --platform android
```

## 📱 Your Apps on Phone

After building, you'll have:

| App Name | Icon Label | When to Use |
|----------|-----------|-------------|
| **FINEX** | Original | Your real app with real data - DON'T DELETE! |
| **FINEX (Dev)** | Has "(Dev)" badge | For development & testing new features |
| **FINEX (Preview)** | Has "(Preview)" badge | For testing production builds |

## ⚡ Daily Development Workflow

1. Open terminal in project folder
2. Run: `npm start`
3. Open **FINEX (Dev)** app on your phone
4. Scan the QR code
5. Code changes will hot reload automatically!

## 🆘 Troubleshooting

### "QR code opens wrong app"
**Cause:** Development build not installed yet  
**Fix:** Run `eas build --profile development --platform android`

### "Can't see FINEX (Dev) app"
**Cause:** Build failed or APK not installed  
**Fix:** Check `eas build:list` and install the APK

### "Changes not updating"
**Cause:** Not connected to dev server  
**Fix:** 
1. Make sure `npm start` is running
2. Shake device → Reload
3. Check you're in the DEV app, not production

## 🎯 Remember

- ✅ Production app = Your real data (safe!)
- ✅ Dev app = Testing only (can break, no problem!)
- ✅ Build dev APK only ONCE, then use `npm start` daily
- ✅ Both apps have separate data storage

## 📚 Need More Info?

See `BUILD_PROFILES.md` for complete documentation.
