# Performance Optimization Guide

This document outlines the performance optimizations implemented to reduce screen transition lag and improve overall app performance.

## Implemented Optimizations

### 1. Navigation Optimizations

#### App.tsx
- Added `InteractionManager` for better navigation transitions
- Implemented custom navigation theme for smoother transitions
- Added performance-optimized stack navigator with custom interpolators
- Enhanced lazy loading with better error boundaries

#### SwipeableBottomTabNavigator.tsx
- **Lazy Loading**: Screens are now lazy-loaded using React.lazy()
- **Memoization**: Components are memoized with React.memo() to prevent unnecessary re-renders
- **InteractionManager**: Tab switches use InteractionManager.runAfterInteractions() for smoother transitions
- **Performance Settings**: TabView configured with optimizations:
  - `lazy={true}` - Only render active and adjacent screens
  - `lazyPreloadDistance={1}` - Preload only 1 screen in each direction
  - `removeClippedSubviews={true}` - Remove off-screen views from memory
  - `optimizationsEnabled={true}` - Enable native optimizations
  - `sceneContainerStyle` - Transparent backgrounds for better performance

### 2. Component Optimizations

#### Modal Components
- **AddExpenseModal**: Wrapped with React.memo()
- **AddIncomeModal**: Wrapped with React.memo()
- Other heavy modals should follow the same pattern

#### Screen Wrapper
- **ScreenWrapper.tsx**: Universal wrapper that delays rendering until after navigation
- Uses InteractionManager to avoid expensive renders during transitions
- Optional loading indicators and delay settings

### 3. Performance Hooks

#### usePerformance.ts
- **useScreenPerformance**: Delays expensive operations until screen is ready
- **useThrottledState**: Throttles state updates to reduce re-renders
- **useDebouncedState**: Debounces rapid state changes
- **useLazyData**: Lazy loads data after screen transitions complete

#### performanceOptimizer.ts
- **PerformanceOptimizer**: Singleton class for managing performance tasks
- **Task Scheduling**: Queue and execute tasks after interactions
- **Debounce/Throttle**: Utility functions for performance optimization
- **Memory Management**: Cleanup utilities for better memory usage

## Usage Examples

### Using Screen Performance Hook
```tsx
import { useScreenPerformance } from '../hooks/usePerformance';

const MyScreen = () => {
  const { isReady, runAfterInteractions } = useScreenPerformance({
    delayMs: 100, // Optional delay
    enableInteractionDelay: true
  });

  // Heavy operations
  useEffect(() => {
    if (isReady) {
      loadHeavyData();
    }
  }, [isReady]);

  return isReady ? <ScreenContent /> : <LoadingIndicator />;
};
```

### Using Screen Wrapper
```tsx
import ScreenWrapper from '../components/ScreenWrapper';

const MyScreen = () => (
  <ScreenWrapper delayMs={50}>
    <HeavyScreenContent />
  </ScreenWrapper>
);
```

### Memoizing Components
```tsx
const HeavyComponent = React.memo(({ data }) => {
  // Expensive rendering logic
});

export default React.memo(HeavyComponent);
```

## Performance Benefits

1. **Faster Navigation**: Screen transitions are now smoother with reduced lag
2. **Better Memory Usage**: Lazy loading and proper cleanup reduce memory footprint
3. **Reduced Re-renders**: Memoization prevents unnecessary component updates
4. **Smoother Animations**: InteractionManager ensures animations complete before heavy work
5. **Progressive Loading**: Content loads progressively after navigation completes

## Best Practices

1. **Always use InteractionManager** for expensive operations after navigation
2. **Memoize heavy components** with React.memo()
3. **Implement lazy loading** for screens and data
4. **Use performance hooks** for managing expensive operations
5. **Profile performance** regularly to identify bottlenecks

## Monitoring Performance

- Use React Developer Tools Profiler
- Monitor memory usage with Metro bundler
- Test on lower-end devices
- Use console timing for critical paths

## Future Optimizations

- Implement virtual scrolling for large lists
- Add image optimization and caching
- Consider code splitting for larger bundles
- Implement progressive web app features for web builds