# Development Screen PIN Protection - UX Specification

## Overview

The Development Tools screen contains sensitive debugging and testing features that should be hidden from regular users. Access requires a PIN entry system.

---

## 🔐 PIN Protection Flow

### Entry Point: Quick Settings Screen

Current behavior (keep):
- User taps on app version 5 times
- Alert dialog appears: "🛠️ Developer Mode Activated"

New behavior (add PIN gate):
- After the alert, instead of directly navigating to DevTools
- Navigate to PIN Entry Screen first
- Only after correct PIN → navigate to Development Tools

---

## 📱 PIN Entry Screen Design

### Visual Layout

```
┌─────────────────────────────────────────────────┐
│ ←                                               │
│                                                 │
│                                                 │
│                   🔒                            │
│                                                 │
│              Developer Access                   │
│                                                 │
│        Enter your PIN to continue               │
│                                                 │
│                                                 │
│         ●  ●  ●  ○  ○  ○  ○  ○                 │
│                                                 │
│        ─────────────────────────                │
│                                                 │
│                                                 │
│       ┌─────┐  ┌─────┐  ┌─────┐                │
│       │     │  │     │  │     │                │
│       │  1  │  │  2  │  │  3  │                │
│       │     │  │     │  │     │                │
│       └─────┘  └─────┘  └─────┘                │
│                                                 │
│       ┌─────┐  ┌─────┐  ┌─────┐                │
│       │     │  │     │  │     │                │
│       │  4  │  │  5  │  │  6  │                │
│       │     │  │     │  │     │                │
│       └─────┘  └─────┘  └─────┘                │
│                                                 │
│       ┌─────┐  ┌─────┐  ┌─────┐                │
│       │     │  │     │  │     │                │
│       │  7  │  │  8  │  │  9  │                │
│       │     │  │     │  │     │                │
│       └─────┘  └─────┘  └─────┘                │
│                                                 │
│       ┌─────┐  ┌─────┐  ┌─────┐                │
│       │     │  │     │  │     │                │
│       │  ⌫  │  │  0  │  │  ✓  │                │
│       │     │  │     │  │     │                │
│       └─────┘  └─────┘  └─────┘                │
│                                                 │
│                                                 │
│            Forgot PIN?                          │
│                                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Design Specifications

#### Header
- **Back Button**: Top left, navigates back to settings
- **Lock Icon**: Centered, 48x48, primary color
- **Title**: "Developer Access" - 24px, bold, primary text color
- **Subtitle**: "Enter your PIN to continue" - 14px, secondary text color

#### PIN Dots
- **8 dots total** (PIN: 21062001)
- **Empty state**: Outlined circle, 16px diameter
- **Filled state**: Solid circle, primary color
- **Spacing**: 12px between dots
- **Animation**: Scale up slightly when filled

#### Number Pad
- **Button size**: 72x72px
- **Border radius**: 36px (circular)
- **Background**: theme.colors.surface
- **Active state**: theme.colors.primary with 20% opacity
- **Font size**: 28px, bold
- **Spacing**: 16px gap between buttons

#### Special Buttons
- **Backspace (⌫)**: Delete last digit
- **Confirm (✓)**: Validate PIN (optional, can auto-submit)
- Both should have same sizing as number buttons

#### Forgot PIN Link
- **Text**: "Forgot PIN?"
- **Style**: Underlined, secondary color
- **Position**: Centered, below keypad
- **Tap area**: 44px minimum height

---

## 🔄 State Management

### States

```typescript
interface PINEntryState {
  enteredPIN: string;           // Max 8 digits
  attempts: number;             // Failed attempts count
  isLocked: boolean;            // Cooldown active
  lockEndTime: number | null;   // When cooldown ends
  error: string | null;         // Error message to display
  isLoading: boolean;           // Verifying PIN
}
```

### Constants

```typescript
const DEV_PIN = '21062001';        // The correct PIN
const MAX_ATTEMPTS = 3;            // Before cooldown
const COOLDOWN_SECONDS = 30;       // Cooldown duration
const PIN_LENGTH = 8;              // Expected PIN length
```

---

## 📋 Behavior Specifications

### Normal Flow

1. User enters digit → digit added to enteredPIN
2. Corresponding dot fills with animation
3. Light haptic feedback on each press
4. When 8th digit entered → auto-validate

### Correct PIN (21062001)

1. Show brief success state (checkmark animation)
2. Medium haptic feedback (success)
3. Navigate to Development Tools screen
4. Reset PIN state

### Wrong PIN

1. Show error message: "Incorrect PIN. Please try again."
2. Shake animation on PIN dots
3. Error haptic feedback
4. Clear entered PIN
5. Increment attempts counter
6. After 3 failed attempts → show cooldown

### Cooldown State

1. Show message: "Too many attempts. Try again in {seconds}s"
2. Disable all number buttons
3. Show countdown timer
4. When timer ends → reset attempts, enable input

### Backspace Button

1. Remove last digit from enteredPIN
2. Unfill corresponding dot
3. Light haptic feedback
4. If already empty → no action

---

## 💡 "Forgot PIN?" Feature

### Trigger
User taps "Forgot PIN?" text

### Modal Design

```
┌─────────────────────────────────────────┐
│                                         │
│              💡                         │
│                                         │
│           PIN Hint                      │
│                                         │
│   ─────────────────────────────────     │
│                                         │
│   "The day the developer's brother     │
│            was born"                    │
│                                         │
│   ─────────────────────────────────     │
│                                         │
│           ┌─────────┐                   │
│           │   OK    │                   │
│           └─────────┘                   │
│                                         │
└─────────────────────────────────────────┘
```

### Modal Specifications
- **Icon**: 💡 or lightbulb icon, 48px
- **Title**: "PIN Hint" - 20px, bold
- **Message**: "The day the developer's brother was born"
- **Font**: 16px, centered, secondary text color
- **Button**: "OK" - primary button style
- **Behavior**: Modal dismisses, returns to PIN entry
- **NO reset functionality**
- **NO unlock bypass**

---

## 🎨 Theme Support

### Light Mode
```typescript
{
  background: '#FFFFFF',
  surface: '#F5F5F5',
  primary: '#007AFF',
  primaryText: '#000000',
  secondaryText: '#666666',
  error: '#FF3B30',
  success: '#34C759',
  border: '#E0E0E0'
}
```

### Dark Mode
```typescript
{
  background: '#1C1C1E',
  surface: '#2C2C2E',
  primary: '#0A84FF',
  primaryText: '#FFFFFF',
  secondaryText: '#8E8E93',
  error: '#FF453A',
  success: '#30D158',
  border: '#38383A'
}
```

---

## ⚡ Animations

### Dot Fill Animation
- **Duration**: 150ms
- **Easing**: ease-out
- **Transform**: scale(1) → scale(1.2) → scale(1)

### Shake Animation (on error)
- **Duration**: 400ms
- **Type**: Horizontal shake
- **Sequence**: translateX(0, -10, 10, -10, 10, 0)

### Modal Entry
- **Duration**: 200ms
- **Type**: Fade + scale
- **From**: opacity(0), scale(0.95)
- **To**: opacity(1), scale(1)

---

## 🔒 Security Considerations

1. **PIN is hardcoded** - for development purposes only
2. **No persistent storage** - attempts reset on app restart
3. **No logging** - PIN attempts should not be logged
4. **Rate limiting** - 30-second cooldown after 3 failed attempts
5. **Session-based** - if user navigates away, PIN required again

---

## 📁 File Structure

```
src/
├── screens/
│   └── DevPINScreen.tsx         # New PIN entry screen
├── components/
│   └── PINKeypad.tsx            # Reusable PIN keypad component
│   └── PINDots.tsx              # PIN dots indicator component
└── constants/
    └── devConfig.ts             # DEV_PIN constant (obfuscated)
```

---

## 🧪 Test Cases

| Test Case | Expected Result |
|-----------|-----------------|
| Enter correct PIN (21062001) | Navigate to Dev Tools |
| Enter wrong PIN | Show error, shake, clear |
| Enter 3 wrong PINs | Show 30s cooldown |
| Tap backspace | Remove last digit |
| Tap "Forgot PIN?" | Show hint modal |
| Dismiss hint modal | Return to PIN entry |
| Navigate back | Return to settings |
| Wait for cooldown | Re-enable input |

---

## 📝 Implementation Notes

### Integration with Existing Flow

**Current (QuickSettingsScreen.tsx, line ~461):**
```typescript
onPress: () => navigation.navigate('DevelopmentTools' as never),
```

**New:**
```typescript
onPress: () => navigation.navigate('DevPINEntry' as never),
```

Then in DevPINScreen, on successful PIN:
```typescript
navigation.replace('DevelopmentTools');
```

### Navigation Stack Update (App.tsx)

Add new screen:
```typescript
<Stack.Screen 
  name="DevPINEntry" 
  component={DevPINScreen}
  options={{ 
    headerShown: false,
    presentation: 'modal',
    gestureEnabled: false,  // Prevent swipe dismiss
  }}
/>
```

---

*Document Version: 1.0*
*Last Updated: December 21, 2025*
