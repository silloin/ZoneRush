# Directions Panel Toggle - Integration Guide

## ✅ What's Been Created

A new `DirectionsPanel.jsx` component with:
- ✨ **Toggle functionality** - Minimize/expand with one click
- 📱 **Mobile optimized** - Swipe handle, 50% height overlay on mobile
- 🎯 **Floating action button** - Bottom-right toggle button
- 🎨 **Smooth animations** - CSS transitions for show/hide
- ♿ **Accessibility** - Keyboard support and ARIA labels

## 🔧 How to Integrate (3 Simple Steps)

### Step 1: Add Import

In `MapboxMap.jsx`, add this import at the top (around line 16):

```javascript
import DirectionsPanel from './DirectionsPanel';
```

**Example:**
```javascript
import RunTracker from '../RunTracker';
import IntervalTimer from '../IntervalTimer';
import UserProfileModal from '../Chat/UserProfileModal';
import DirectionsPanel from './DirectionsPanel';  // ← Add this line
import './Map.css';
```

### Step 2: Remove Old State (Optional)

You can remove the `isDirectionsMinimized` state if you added it (around line 85):

```javascript
// DELETE THIS LINE:
const [isDirectionsMinimized, setIsDirectionsMinimized] = useState(false);
```

### Step 3: Replace Old Panel Code

Find the directions panel section (around line 1581-1620) and replace it with:

**OLD CODE (Delete this):**
```javascript
{showDirectionsPanel && directionsData && (
  <div
    className="absolute bottom-0 left-0 right-0 bg-white shadow-lg z-30 ..."
    onDoubleClick={() => setShowDirectionsPanel(false)}
    title="Double-click to hide directions panel"
  >
    {/* ... old content ... */}
  </div>
)}
```

**NEW CODE (Replace with):**
```javascript
{showDirectionsPanel && directionsData && (
  <DirectionsPanel
    directionsData={directionsData}
    onClose={() => setShowDirectionsPanel(false)}
  />
)}
```

## 🎉 That's It!

The new component handles:
- ✅ Minimize/expand state internally
- ✅ Floating toggle button
- ✅ Mobile swipe handle
- ✅ Smooth animations
- ✅ Distance & duration always visible
- ✅ Step-by-step directions hidden when minimized

## 📱 Features

### Mobile View (< 768px)
- Panel overlays bottom 50% of screen
- Swipe handle visible at top
- Tap handle to minimize/expand
- Floating button in bottom-right corner

### Desktop View (≥ 768px)
- Panel appears as sidebar (max-width: md)
- Positioned at bottom-left
- Same toggle functionality

### Toggle Behavior
1. **Default**: Panel fully open when route calculated
2. **Tap handle/button**: Panel minimizes (shows only header with distance/duration)
3. **Tap again**: Panel expands back
4. **Close button (✕)**: Completely hides panel

## 🔍 Testing Checklist

- [ ] Create a route → Panel appears automatically
- [ ] Tap the gray header bar → Panel minimizes
- [ ] Tap again → Panel expands
- [ ] Click floating button (bottom-right) → Toggles minimize/expand
- [ ] Click close button (✕) → Panel disappears
- [ ] Test on mobile device → Verify overlay behavior
- [ ] Test on desktop → Verify sidebar behavior

## 🎨 Customization

Want to change colors? Edit `DirectionsPanel.jsx`:

```javascript
// Change button color (line ~17)
className="fixed bottom-24 right-4 z-50 bg-blue-600 hover:bg-blue-700 ..."

// Change panel background (line ~32)
className="... bg-white shadow-2xl ..."

// Change header background (line ~43)
className="w-full bg-gray-100 border-b border-gray-200 ..."
```

## 🚀 Next Steps (Optional)

1. **Add swipe gesture**: Use `react-swipeable` for real swipe up/down
2. **Persist state**: Save minimized state to localStorage
3. **Add sound**: Play sound when minimizing/expanding
4. **Add double-tap on map**: 
   ```javascript
   map.current.on('dblclick', () => {
     setShowDirectionsPanel(prev => !prev);
   });
   ```

## 📞 Need Help?

If you have any issues:
1. Check browser console for errors
2. Verify the import path is correct
3. Make sure old panel code is completely removed

---

**Created**: 2026-04-16
**Component**: `client/src/components/Map/DirectionsPanel.jsx`
**Integration File**: `client/src/components/Map/MapboxMap.jsx`
