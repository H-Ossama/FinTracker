# 🎨 FinTracker Icon Update Guide

## Your New Icon Design
The new icon features a beautiful gradient wallet design with:
- **Gradient**: Turquoise to blue (#20C6F7 to #1E90FF)
- **Design**: Modern wallet with dollar bills and coin
- **Style**: Rounded square with clean, professional look

## Step-by-Step Icon Implementation

### 1. **Prepare Your Icon Files**
You need to create these specific files from your new design:

#### 📱 **icon.png** (1024x1024)
- Main app icon for both iOS and Android
- Square format with rounded corners (system will handle)
- High resolution PNG format

#### 🤖 **adaptive-icon.png** (1024x1024) 
- Android adaptive icon foreground
- Should be the wallet icon without background
- Transparent background recommended
- Keep icon centered with safe margins

#### 🌐 **favicon.png** (48x48)
- Web version icon
- Small size, ensure visibility at tiny scale
- PNG format

#### 🚀 **splash.png** (1284x2778)
- Launch screen image
- Can be same as icon but larger or a variation
- Portrait orientation

### 2. **Quick Icon Generation Tools**

#### Option A: Online Tools (Recommended)
1. **AppIcon.co** - Upload your 1024x1024 icon
   - Generates all required sizes automatically
   - Download the Expo/React Native package

2. **IconKitchen** - Google's adaptive icon tool
   - Perfect for Android adaptive icons
   - Handles safe areas automatically

#### Option B: Manual Creation
Use any image editor (Photoshop, GIMP, Figma, etc.):
1. Start with 1024x1024 canvas
2. Design your wallet icon
3. Export in required sizes
4. Ensure transparency where needed

### 3. **Design Guidelines**

#### ✅ **Do:**
- Keep important elements within 80% of the canvas (safe area)
- Use high contrast for visibility
- Test at small sizes (48px, 24px)
- Maintain consistent visual weight
- Use the gradient (#20C6F7 to #1E90FF) for brand consistency

#### ❌ **Don't:**
- Place important details near edges
- Use thin lines that disappear at small sizes
- Include text (it becomes unreadable)
- Use low contrast colors

### 4. **File Replacement**
Once you have your icon files ready:

```bash
# Replace the existing icon files
cp your-new-icon-1024.png assets/icon.png
cp your-new-adaptive-icon-1024.png assets/adaptive-icon.png  
cp your-new-favicon-48.png assets/favicon.png
cp your-new-splash-1284x2778.png assets/splash.png
```

### 5. **Test Your New Icons**

```bash
# Clear cache and restart
npm run clean
npm start

# Test on different platforms
npm run ios
npm run android
npm run web
```

### 6. **Verify Implementation**
Check that your new icons appear in:
- [ ] App drawer/home screen
- [ ] Settings > Apps
- [ ] Recent apps switcher
- [ ] Notifications
- [ ] Web browser tab
- [ ] Splash screen

## 🎯 **Icon Specifications Summary**

| File | Dimensions | Purpose | Background |
|------|------------|---------|------------|
| icon.png | 1024×1024 | Main app icon | With gradient |
| adaptive-icon.png | 1024×1024 | Android adaptive | Transparent |
| favicon.png | 48×48 | Web icon | With gradient |
| splash.png | 1284×2778 | Launch screen | Optional |

## 🚀 **Build Configuration**
The app.json has been updated with:
- Gradient background color (#20C6F7)
- Proper icon paths
- Optimized notification icons
- Splash screen matching your theme

## 💡 **Pro Tips**
1. **Test on real devices** - Icons look different on actual phones
2. **Check both light/dark modes** - Ensure visibility in all themes
3. **Preview in app stores** - See how it appears in store listings
4. **A/B test with users** - Get feedback on recognizability

---

**Ready to implement?** Save your new icon as the required files and replace them in the assets folder!