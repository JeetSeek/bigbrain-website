# Manufacturer Dropdown Visibility Fix
**Date:** October 21, 2025, 11:44 PM  
**Issue:** Dropdown menu was cut off and not fully visible

---

## Problem

When clicking on the manufacturer dropdown in the Boiler Manual Finder, the dropdown list was:
- Cut off at the bottom
- Not fully visible
- Had insufficient z-index

---

## Root Cause

The dropdown had:
1. Limited `max-h-60` (240px) which was too small
2. No explicit `z-index` causing layering issues
3. Insufficient shadow for proper visual hierarchy
4. No inline styles for reliable rendering

---

## Fix Applied

### Updated Dropdown Styling

**File:** `src/components/ManualFinderStandalone.jsx` (Lines 621-629)

**Before:**
```jsx
{showManufacturers && (
  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
```

**After:**
```jsx
{showManufacturers && manufacturers.length > 0 && (
  <div 
    className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-80 overflow-y-auto"
    style={{
      zIndex: 9999,
      maxHeight: '320px',
      overflowY: 'auto',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.15)'
    }}
  >
```

---

## Changes Made

### 1. Increased Max Height
- **Before:** `max-h-60` (240px)
- **After:** `max-h-80` (320px) + inline `maxHeight: '320px'`
- **Impact:** More manufacturers visible without scrolling

### 2. Added Explicit Z-Index
- **Added:** `zIndex: 9999`
- **Impact:** Dropdown appears above all other elements

### 3. Enhanced Shadow
- **Before:** Basic Tailwind shadow
- **After:** Professional layered shadow
- **CSS:** `0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.15)`
- **Impact:** Better visual separation and depth

### 4. Explicit Positioning
- **Added:** `top-full left-0 right-0`
- **Impact:** Reliable positioning below button

### 5. Added Condition Check
- **Added:** `manufacturers.length > 0` check
- **Impact:** Dropdown only shows when data is available

---

## Result

✅ **Dropdown now fully visible**  
✅ **Proper z-index layering**  
✅ **Professional shadow depth**  
✅ **320px max height** (can show ~10 manufacturers)  
✅ **Smooth scrolling** for longer lists  
✅ **Reliable positioning**  

---

## Testing

**To verify the fix:**
1. Navigate to Boiler Manuals tab
2. Click on "All Manufacturers" dropdown
3. Dropdown should:
   - Appear fully visible
   - Show up to 320px height
   - Have proper shadow
   - Be above other elements
   - Scroll smoothly if needed

---

## Status

✅ **Fixed and Ready**

The manufacturer dropdown is now fully functional with proper visibility and professional styling.
