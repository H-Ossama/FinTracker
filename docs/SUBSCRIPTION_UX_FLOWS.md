# FinTracker Subscription UX Flow & User Journey

## 📊 User Journey Maps

---

## 1. New User Journey (First 7 Days)

```
Day 1: Download & Setup
├── User downloads app
├── Onboarding tutorial
├── Creates first wallet
├── Default: FREE plan (no prompt yet)
└── ✨ No subscription prompts

Day 2-3: Initial Usage
├── Adds transactions
├── Explores features
├── Hits no limits yet
└── ✨ Subtle "Pro" badge visible in profile

Day 4-5: Growing Usage
├── Approaches transaction limit (40/50)
├── May hit wallet limit (2)
├── Shows remaining count: "8 transactions left this month"
└── ⚡ Soft awareness building

Day 6-7: First Paywall
├── User hits actual limit
├── Friendly paywall appears
├── "Maybe Later" prominent
└── 🎯 First conversion opportunity
```

---

## 2. Feature-Specific Paywall Triggers

### Wallets (Limit: 2)

**Trigger Point**: User taps "Add Wallet" with 2 existing wallets

**Screen Flow**:
```
[Add Wallet Button Tap]
         │
         ▼
┌─────────────────────────────┐
│   🏦 Need More Wallets?     │
│                             │
│   Free plan includes 2      │
│   wallets. You're using     │
│   both!                     │
│                             │
│   Upgrade to Pro for        │
│   unlimited wallets.        │
│                             │
│   [⭐ Upgrade to Pro]       │
│                             │
│   [Maybe Later]             │
└─────────────────────────────┘
```

### Transactions (Limit: 50/month)

**Trigger Point**: User tries to add 51st transaction

**Pre-emptive Warning** (at 45 transactions):
```
┌─────────────────────────────────────┐
│ ⚠️ 5 transactions left this month  │
│    Upgrade to Pro for unlimited →   │
└─────────────────────────────────────┘
```

**Hard Limit Screen**:
```
┌─────────────────────────────┐
│   📊 Transaction Limit      │
│      Reached                │
│                             │
│   You've logged 50          │
│   transactions this month.  │
│                             │
│   Resets on [Date]          │
│   or upgrade now!           │
│                             │
│   [⭐ Upgrade to Pro]       │
│                             │
│   [Wait for Reset]          │
└─────────────────────────────┘
```

### Cloud Backup (Pro Only)

**Trigger Point**: User taps "Backup" or "Sync" option

**Screen Flow**:
```
┌─────────────────────────────┐
│   ☁️ Cloud Backup           │
│                             │
│   Keep your financial       │
│   data safe with automatic  │
│   cloud backup.             │
│                             │
│   • Sync across devices     │
│   • Automatic daily backup  │
│   • Restore anytime         │
│   • End-to-end encrypted    │
│                             │
│   Available with Pro        │
│                             │
│   [⭐ Upgrade to Pro]       │
│                             │
│   [Maybe Later]             │
└─────────────────────────────┘
```

### Data Export (Pro Only)

**Trigger Point**: User taps "Export" button

**Screen Flow**:
```
┌─────────────────────────────┐
│   📥 Export Your Data       │
│                             │
│   Download your financial   │
│   records in:               │
│                             │
│   • PDF Reports             │
│   • CSV Spreadsheets        │
│   • Excel Files             │
│                             │
│   Perfect for taxes,        │
│   accountants, or personal  │
│   records.                  │
│                             │
│   Available with Pro        │
│                             │
│   [⭐ Upgrade to Pro]       │
│                             │
│   [Maybe Later]             │
└─────────────────────────────┘
```

---

## 3. Subscription Screen User Flows

### Flow A: User Opens Subscription from Profile

```
[Profile Screen]
      │
      ├── Taps "Manage Subscription"
      │
      ▼
[Subscription Screen]
      │
      ├── If FREE user:
      │   ├── Shows current limits
      │   ├── Shows plan comparison
      │   ├── Highlights Yearly as "Best Value"
      │   └── Single CTA: "Upgrade to Pro"
      │
      └── If PRO user:
          ├── Shows "You're on Pro!"
          ├── Shows subscription details
          ├── Next billing date
          └── "Manage in Google Play" link
```

### Flow B: User Selects Plan

```
[Subscription Screen]
      │
      ├── User taps Yearly/Monthly toggle
      │   └── Updates price display
      │
      ├── User taps "Upgrade to Pro"
      │
      ▼
[Google Play Billing Sheet]
      │
      ├── SUCCESS:
      │   ├── Close billing sheet
      │   ├── Show success animation
      │   ├── "Welcome to Pro! 🎉"
      │   ├── Update subscription state
      │   └── Navigate back (or stay)
      │
      └── CANCELLED/FAILED:
          ├── Close billing sheet
          ├── Stay on subscription screen
          └── No error message (user cancelled)
```

### Flow C: Restore Purchases

```
[Subscription Screen]
      │
      ├── User taps "Restore Purchases"
      │
      ▼
[Loading State]
      │
      ├── Query Google Play
      │
      ├── FOUND SUBSCRIPTION:
      │   ├── "Subscription restored!"
      │   ├── Update to Pro status
      │   └── Refresh screen
      │
      └── NO SUBSCRIPTION:
          └── "No active subscription found"
```

---

## 4. Upgrade Modal (Paywall) Behavior

### Display Rules

| Rule | Description |
|------|-------------|
| **Once per feature per session** | Don't show same paywall twice in same session |
| **Dismissible always** | "Maybe Later" always visible and functional |
| **No auto-popup** | Only shows when user hits actual limit |
| **No countdown timers** | No artificial urgency |
| **Clear value prop** | Always explain what user gets |

### Animation & Timing

```
Modal Entry:
├── Fade in background (200ms)
├── Scale up modal (200ms, spring)
└── Total: ~300ms

Modal Exit:
├── Scale down modal (150ms)
├── Fade out background (150ms)
└── Total: ~200ms

Button Press:
├── Scale down (50ms)
├── Scale up (100ms)
└── Haptic feedback
```

---

## 5. Free User Experience Optimization

### Showing Limits Gracefully

**In Dashboard/Home**:
```
┌─────────────────────────────────────────┐
│ 📊 Your Limits                          │
│                                         │
│ Transactions: ████████░░ 42/50         │
│ Wallets:      ██████████ 2/2           │
│ Goals:        ██████████ 1/1           │
│                                         │
│ [Unlock Unlimited →]                    │
└─────────────────────────────────────────┘
```

**In Add Modals** (when near limit):
```
┌─────────────────────────────────────────┐
│ Add Transaction                         │
│                                         │
│ [Form fields...]                        │
│                                         │
│ ⚠️ 8 transactions remaining this month │
│                                         │
│ [Save Transaction]                      │
└─────────────────────────────────────────┘
```

### Pro Feature Visibility

Show Pro features in UI but with lock icon:
```
┌─────────────────────────────────────────┐
│ More                                    │
│                                         │
│ 📊 Analytics          [VIEW →]          │
│ 🎯 Goals              [VIEW →]          │
│ 📅 Bills              [VIEW →]          │
│ ☁️ Cloud Backup       [🔒 PRO]          │
│ 📥 Export Data        [🔒 PRO]          │
│ 📈 Advanced Insights  [🔒 PRO]          │
│                                         │
└─────────────────────────────────────────┘
```

---

## 6. Pro User Experience

### Pro Badge Display

Show Pro status prominently:
```
Profile Header:
┌─────────────────────────────────────────┐
│ 👤 John Doe                             │
│ john@email.com                          │
│ ⭐ PRO Member                           │
└─────────────────────────────────────────┘
```

### Subscription Management

```
[Profile → Subscription]
┌─────────────────────────────────────────┐
│ Your Subscription                       │
│                                         │
│ Plan: Pro (Yearly)          ⭐          │
│ Status: Active                          │
│ Next billing: Dec 21, 2026             │
│ Amount: $29.99/year                     │
│                                         │
│ ─────────────────────────────────────   │
│                                         │
│ [Manage in Google Play →]               │
│                                         │
│ To cancel or change billing, visit      │
│ Google Play subscriptions.              │
└─────────────────────────────────────────┘
```

---

## 7. Subscription Expiry Flow

### Pre-Expiry Warning (7 days before)

```
[Home Screen Banner]
┌─────────────────────────────────────────┐
│ ⚠️ Your Pro subscription ends in 7 days │
│    [Renew Now] or [Manage]              │
└─────────────────────────────────────────┘
```

### Grace Period (if payment fails)

```
[Home Screen Banner]
┌─────────────────────────────────────────┐
│ ⚠️ Payment issue with your subscription │
│    Update payment method to keep Pro    │
│    [Update in Google Play]              │
└─────────────────────────────────────────┘
```

### Post-Expiry Transition

```
[First Launch After Expiry]
┌─────────────────────────────────────────┐
│                                         │
│   Your Pro subscription has ended       │
│                                         │
│   You've been moved to the Free plan.   │
│   Your data is safe and intact.         │
│                                         │
│   Free limits now apply:                │
│   • 2 wallets                           │
│   • 50 transactions/month               │
│   • 1 goal, 1 budget                    │
│                                         │
│   [Resubscribe to Pro]                  │
│                                         │
│   [Continue with Free]                  │
│                                         │
└─────────────────────────────────────────┘
```

**Data Handling on Downgrade**:
- All existing data preserved
- Cannot add new items beyond limits
- Can view/edit existing items
- Cloud backup paused (but data preserved)

---

## 8. Copy Guidelines

### Tone of Voice

| ✅ Do | ❌ Don't |
|-------|---------|
| Friendly and helpful | Aggressive or pushy |
| Value-focused | Fear-based |
| Transparent | Misleading |
| Respectful of choice | Manipulative |

### Example Copy Comparisons

**Bad ❌**:
> "Don't miss out! Limited time offer! Upgrade NOW before prices increase!"

**Good ✅**:
> "Unlock unlimited tracking with Pro. Cancel anytime."

---

**Bad ❌**:
> "You're BLOCKED from adding more wallets. Pay to unlock."

**Good ✅**:
> "Free plan includes 2 wallets. Need more? Upgrade to Pro for unlimited wallets."

---

**Bad ❌**:
> "Your free trial is about to expire! Subscribe now or lose access!"

**Good ✅**:
> "Your subscription ends in 7 days. Renew to keep your Pro features."

---

## 9. Error States & Edge Cases

### Purchase Failed

```
┌─────────────────────────────────────────┐
│                                         │
│   ❌ Purchase couldn't be completed     │
│                                         │
│   Please try again or check your        │
│   payment method in Google Play.        │
│                                         │
│   [Try Again]                           │
│   [Cancel]                              │
│                                         │
└─────────────────────────────────────────┘
```

### Network Error During Purchase

```
┌─────────────────────────────────────────┐
│                                         │
│   📶 Connection issue                   │
│                                         │
│   Please check your internet            │
│   connection and try again.             │
│                                         │
│   [Try Again]                           │
│                                         │
└─────────────────────────────────────────┘
```

### Subscription Status Unknown

```
┌─────────────────────────────────────────┐
│                                         │
│   ⏳ Checking subscription status...    │
│                                         │
│   [Loading indicator]                   │
│                                         │
│   If you recently purchased, it may     │
│   take a few moments to activate.       │
│                                         │
└─────────────────────────────────────────┘
```

---

## 10. Accessibility Considerations

### Screen Reader Support

- All buttons have descriptive labels
- Price information read clearly
- Modal announcements on open/close
- Focus management in PIN screen

### Touch Targets

- Minimum 44x44pt touch targets
- Adequate spacing between buttons
- PIN keypad buttons are 72x72pt

### Color Contrast

- Text meets WCAG AA standards
- Don't rely solely on color for information
- Error states have text AND color indicators

---

*Document Version: 1.0*
*Last Updated: December 21, 2025*
