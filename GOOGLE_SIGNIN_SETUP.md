# Google Sign-In Setup Instructions

## � **Current Status Check**

I've analyzed your project and here's what you need to complete:

### ✅ **Already Configured:**
- ✅ Package name: `com.oussamaaaaa.finex` 
- ✅ Google Sign-In dependencies installed
- ✅ App config plugin added
- ✅ Authentication code implemented

### ❌ **Missing Configuration:**
- ❌ `google-services.json` file (Android)
- ❌ Google Services plugin in build.gradle
- ❌ Actual Firebase credentials in .env file

---

## 🚀 **Steps You Need to Complete**

### **Step 1: Get Your Firebase Configuration Files**

Since you mentioned you already added the app to Firebase, you need to download the configuration files:

1. **Go to your Firebase Console**
2. **Select your FinTracker project**
3. **Go to Project Settings** (gear icon) → **General**
4. **Download Android config file:**
   - Find your Android app with package name: `com.oussamaaaaa.finex`
   - Click **Download google-services.json**
   - **Place the file here:** `android/app/google-services.json`

### **Step 2: Add Google Services Plugin**

Add the Google Services plugin to your Android build configuration:

### **Step 2: Add Google Services Plugin**

Add the Google Services plugin to your Android build configuration:

**File: `android/build.gradle`** - Add this line to dependencies:
```gradle
dependencies {
    classpath('com.android.tools.build:gradle')
    classpath('com.facebook.react:react-native-gradle-plugin')
    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
    classpath('com.google.gms:google-services:4.4.0')  // ADD THIS LINE
}
```

**File: `android/app/build.gradle`** - Add this line at the very bottom:
```gradle
apply plugin: 'com.google.gms.google-services'  // ADD THIS LINE
```

### **Step 3: Get Your Client IDs from Firebase**

1. **In Firebase Console**, go to **Project Settings** → **General**
2. **Copy these values** and update your `.env` file:

   - **Web client ID**: Found in the "Web" app section
   - **Android client ID**: Found in your Android app details
   - **Project ID**: At the top of the page
   - **API Key**: In your Android app configuration

### **Step 4: Update Environment Variables**

Replace the placeholder values in your `.env` file with actual Firebase credentials:

```bash
# Replace with your ACTUAL Firebase Web Client ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com

# Replace with your ACTUAL Firebase project details  
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-actual-project-id
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:android:abc123def456
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyA_your_actual_api_key
```

### **Step 5: Verify Google Sign-In is Enabled**

1. **In Firebase Console**, go to **Authentication** → **Sign-in method**
2. **Make sure Google is enabled** (should show as "Enabled")
3. **If not enabled**: Click on Google → Toggle "Enable" → Save

---

## 🛠️ **Quick Commands to Run**

After completing the above steps:

```bash
# Clean and rebuild the project
cd android
./gradlew clean
cd ..

# Install dependencies and start
npm install
npm run android
```

---

## 🔍 **How to Find Your Firebase Values**

### **Firebase Console Navigation:**
1. **Go to:** [Firebase Console](https://console.firebase.google.com/)
2. **Select your project**
3. **Click the gear icon** → **Project settings**
4. **Scroll to "Your apps"** section

### **What to Copy:**

**From the Android App card:**
- **Application ID**: Should be `com.oussamaaaaa.finex`
- **App ID**: Copy this for `EXPO_PUBLIC_FIREBASE_APP_ID`
- **API Key**: Copy this for `EXPO_PUBLIC_FIREBASE_API_KEY`

**From the Web App card (if you have one):**
- **Web client ID**: Copy this for `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

**From the Project info (top of page):**
- **Project ID**: Copy this for `EXPO_PUBLIC_FIREBASE_PROJECT_ID`

---

## ⚠️ **Common Issues & Solutions**

### **Issue 1: "Developer Error" when testing Google Sign-In**
**Solution:** 
- Make sure your `google-services.json` file is in the correct location
- Verify your package name matches exactly: `com.oussamaaaaa.finex`
- Check that Google Services plugin is applied

### **Issue 2: "Network Error" during sign-in**
**Solution:**
- Verify your `.env` file has actual Firebase credentials (not placeholder values)
- Make sure Google Sign-In is enabled in Firebase Console

### **Issue 3: Build errors**
**Solution:**
```bash
cd android
./gradlew clean
cd ..
npm start -- --clear
```

---

## ✅ **Testing Checklist**

After setup, verify these work:
- [ ] App builds successfully with `npm run android`
- [ ] Google Sign-In button appears on login screen
- [ ] Tapping Google button opens Google sign-in flow
- [ ] User can complete sign-in and access the app
- [ ] Cloud sync message appears after successful Google sign-in

---

## � **Need Help?**

If you get stuck:
1. **Check Firebase Console** for any error messages
2. **Run:** `npx expo config --type public` to verify environment variables
3. **Look in Android logs** with `npx react-native log-android`

Your app is almost ready! You just need to download the config file, update the build files, and add your actual Firebase credentials.