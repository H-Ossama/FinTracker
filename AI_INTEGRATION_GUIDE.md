# Gemini AI Integration Guide

This guide explains how to use the Gemini AI features for analytics in FinTracker.

## Overview

The app now uses **Google's Gemini AI API** to provide intelligent financial recommendations and insights. All responses are **cached locally** to avoid unnecessary API calls, and data refreshes only when explicitly requested or after 24 hours.

### Features

- **AI Recommendations**: Smart financial tips based on spending patterns
- **Trend Insights**: Analysis of income/expense trends
- **Spending Insights**: Smart analysis of spending categories
- **Smart Caching**: 24-hour cache to avoid excessive API calls
- **Manual Refresh**: Button to explicitly refresh data from AI

## How It Works

### 1. Architecture

```
Components → useAIInsights hook → analyticsService → geminiAIService
                ↓
            FinTracker Backend (/api/ai/gemini)
                ↓
              Gemini API (server-side key)
                ↓
              AsyncStorage (Cache)
```

### 2. Cache Strategy

- **Duration**: 24 hours
- **Storage**: AsyncStorage (local device storage)
- **Check**: Before making API calls, cached data is checked
- **Refresh**: User can manually refresh via "Refresh" button

### 3. API Calls

The Gemini API is called:
1. **First time**: When user opens Insights screen
2. **After refresh**: When user taps the Refresh button
3. **After 24h**: When cache expires automatically
4. **Never again**: Until one of the above conditions

## Implementation Examples

### Using in Insights Screen

```typescript
import { useAIInsights } from '../hooks/useAIInsights';
import { useAnalyticsRefresh } from '../contexts/AnalyticsRefreshContext';

const InsightsScreen = () => {
  const {
    spendingInsight,
    trendInsight,
    isLoading,
    error,
    fetchSpendingInsights,
    fetchTrendInsights,
    refreshAllInsights,
  } = useAIInsights();
  
  const { refreshRecommendations } = useAnalyticsRefresh();

  useEffect(() => {
    // Fetch insights when data is loaded
    const loadInsights = async () => {
      if (spendingData) {
        await fetchSpendingInsights(spendingData);
      }
      if (trendData) {
        await fetchTrendInsights(trendData);
      }
    };
    
    loadInsights();
  }, [spendingData, trendData]);

  const handleRefresh = async () => {
    // This will call the API again, ignoring cache
    await refreshAllInsights(spendingData, trendData);
  };

  return (
    <View>
      <TouchableOpacity onPress={handleRefresh} disabled={isLoading}>
        <Text>{isLoading ? 'Refreshing...' : '🔄 Refresh AI Insights'}</Text>
      </TouchableOpacity>
      
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      
      {spendingInsight && (
        <View>
          <Text>💡 {spendingInsight}</Text>
        </View>
      )}
      
      {trendInsight && (
        <View>
          <Text>📈 {trendInsight}</Text>
        </View>
      )}
    </View>
  );
};
```

### Getting Recommendations

```typescript
import { analyticsService } from '../services/analyticsService';

// Get recommendations (uses cache if available)
const { data: recommendations } = await analyticsService.getRecommendations();

// Force refresh from API
const { data: freshRecommendations } = await analyticsService.getRecommendations(true);
```

## API Details

### Endpoint

For security, the mobile app should NOT call Gemini directly.
Instead, it calls the FinTracker backend, which calls Gemini using a server-side API key.

Example (backend):
```
POST /api/ai/gemini
```

### API Key

Never hardcode or commit AI API keys.

- Set the Gemini key on the backend only (e.g. `GEMINI_API_KEY` in `backend/.env` or Railway/EAS secrets)
- The mobile app must not contain the key

### Rate Limiting
- The service handles rate limiting gracefully
- If rate limited, it falls back to cached data
- User sees a "Rate limited" message if refresh is attempted too soon

## Cache Management

### Check Cache Status

```typescript
import { useAnalyticsRefresh } from '../contexts/AnalyticsRefreshContext';

const { isRecommendationsCached } = useAnalyticsRefresh();

const isCached = await isRecommendationsCached();
if (isCached) {
  console.log('Using cached recommendations');
}
```

### Clear Cache

```typescript
import { useAnalyticsRefresh } from '../contexts/AnalyticsRefreshContext';

const { clearAllCaches } = useAnalyticsRefresh();

// Clear all AI caches
await clearAllCaches();
```

## Performance Considerations

### What's Cached
- ✅ Recommendations (24h cache)
- ✅ Trend Insights (24h cache)
- ✅ Spending Insights (24h cache)

### Why We Cache
- **Saves API quota**: Free tier has limited requests
- **Faster user experience**: Data loads instantly from cache
- **Offline support**: Can show cached data when offline
- **Cost reduction**: No redundant API calls

### Cache Duration
- **24 hours**: Enough to catch weekly/monthly spending changes
- **Can be customized**: Change `CACHE_DURATION_MS` in `geminiAIService.ts`

## Error Handling

The system gracefully handles errors:

1. **API Failure**: Falls back to local calculations
2. **Parse Error**: Returns fallback recommendations
3. **Network Error**: Uses cached data or local data
4. **Rate Limited**: Uses cache, shows user-friendly message

## Testing

### Test Force Refresh
```typescript
// This forces a fresh API call
await analyticsService.getRecommendations(true);
```

### Test Cache Expiry
Change cache duration in `geminiAIService.ts`:
```typescript
const CACHE_DURATION_MS = 60 * 1000; // 1 minute for testing
```

### Test Offline Mode
1. Turn on Airplane Mode
2. App uses cached data automatically
3. Shows "Using cached data" in logs

## Troubleshooting

### No insights showing up
1. Check if API key is valid
2. Check network connectivity
3. Check AsyncStorage permissions
4. Look at console logs for errors

### Recommendations always using cache
1. This is by design (saves API quota)
2. User can tap refresh button to force API call
3. Cache automatically expires after 24h

### API rate limit errors
1. Wait a minute before refreshing again
2. Check your API quota at Google Cloud Console
3. Consider upgrading API quota if needed

## Future Improvements

- [ ] Store which insights were accessed (analytics)
- [ ] Personalize recommendations based on user preferences
- [ ] Add trend predictions using AI
- [ ] Monthly summary generation
- [ ] Budget recommendations based on patterns
- [ ] Spending anomaly detection

## Security Notes

- ✅ Gemini API key is stored server-side (backend env var) and never shipped to the client
- ✅ No sensitive data should be sent to external APIs (only anonymized aggregates)
- ✅ All caching remains local (device storage only)
