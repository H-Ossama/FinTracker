import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { analyticsService, SpendingData, TrendData } from '../services/analyticsService';
import useAIInsights from '../hooks/useAIInsights';

interface AIInsightsDisplayProps {
  spendingData: SpendingData;
  trendData: TrendData;
}

/**
 * Example component showing how to display AI insights with a refresh button
 * 
 * Usage:
 * <AIInsightsDisplay spendingData={spending} trendData={trends} />
 */
export const AIInsightsDisplay: React.FC<AIInsightsDisplayProps> = ({
  spendingData,
  trendData,
}) => {
  const { theme, isDark } = useTheme();
  const { language } = useLocalization();
  const { isPro, showUpgradeModal } = useSubscription();
  const {
    spendingInsight,
    trendInsight,
    isLoading,
    error,
    fetchSpendingInsights,
    fetchTrendInsights,
    refreshAllInsights,
  } = useAIInsights();

  // Fetch insights on component mount
  useEffect(() => {
    if (isPro) {
      const loadInsights = async () => {
        await fetchSpendingInsights(spendingData);
        await fetchTrendInsights(trendData);
      };
      loadInsights();
    }
  }, [spendingData, trendData, fetchSpendingInsights, fetchTrendInsights, isPro]);

  const handleRefresh = async () => {
    // This forces a fresh API call, ignoring cache
    await refreshAllInsights(spendingData, trendData);
  };

  const texts = {
    en: {
      spending: 'Spending Insight',
      trend: 'Trend Insight',
      refresh: 'Refresh',
      refreshing: 'Refreshing...',
      error: 'Failed to load insights',
      cached: 'Using cached data (24h)',
      lastUpdated: 'Last updated',
      unlockTitle: 'Unlock AI Insights',
      unlockDesc: 'Get intelligent analysis of your spending habits and trend predictions with FinTracker Pro.',
      unlockButton: 'Upgrade to Pro',
    },
    de: {
      spending: 'Ausgabe Einsicht',
      trend: 'Trend Einsicht',
      refresh: 'Aktualisieren',
      refreshing: 'Aktualisierung...',
      error: 'Fehler beim Laden der Einsichten',
      cached: 'Gecacherte Daten (24h)',
      lastUpdated: 'Zuletzt aktualisiert',
      unlockTitle: 'KI-Einblicke freischalten',
      unlockDesc: 'Erhalten Sie intelligente Analysen Ihrer Ausgabegewohnheiten und Trendvorhersagen mit FinTracker Pro.',
      unlockButton: 'Upgrade auf Pro',
    },
    ar: {
      spending: 'رؤية الإنفاق',
      trend: 'رؤية الاتجاه',
      refresh: 'تحديث',
      refreshing: 'جاري التحديث...',
      error: 'فشل تحميل الرؤى',
      cached: 'استخدام البيانات المخزنة مؤقتا (24 ساعة)',
      lastUpdated: 'آخر تحديث',
      unlockTitle: 'فتح رؤى الذكاء الاصطناعي',
      unlockDesc: 'احصل على تحليل ذكي لعادات إنفاقك وتوقعات الاتجاهات مع FinTracker Pro.',
      unlockButton: 'الترقية إلى Pro',
    },
    fr: {
      spending: 'Aperçu des dépenses',
      trend: 'Aperçu des tendances',
      refresh: 'Actualiser',
      refreshing: 'Actualisation...',
      error: 'Échec du chargement des aperçus',
      cached: 'Données en cache (24h)',
      lastUpdated: 'Dernière mise à jour',
      unlockTitle: 'Débloquez les aperçus IA',
      unlockDesc: 'Obtenez une analyse intelligente de vos habitudes de dépenses et des prévisions de tendances avec FinTracker Pro.',
      unlockButton: 'Passer à Pro',
    },
  };

  const t = texts[language as keyof typeof texts] || texts.en;

  if (!isPro) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            💡 AI Insights
          </Text>
          <Ionicons name="lock-closed" size={20} color={theme.colors.textSecondary} />
        </View>
        
        <View style={[styles.lockedContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5' }]}>
          <View style={styles.lockIconContainer}>
            <Ionicons name="lock-closed" size={32} color={theme.colors.primary} />
          </View>
          <Text style={[styles.unlockTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>{t.unlockTitle}</Text>
          <Text style={[styles.unlockDesc, { color: isDark ? '#CCCCCC' : '#666666' }]}>{t.unlockDesc}</Text>
          
          <TouchableOpacity 
            style={[styles.upgradeButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => showUpgradeModal('advancedInsights')}
          >
            <Text style={styles.upgradeButtonText}>{t.unlockButton}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with refresh button */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          💡 AI Insights
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={isLoading}
          style={[styles.refreshButton, { opacity: isLoading ? 0.5 : 1 }]}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            <>
              <Ionicons name="refresh" size={16} color={theme.colors.primary} />
              <Text style={[styles.refreshText, { color: theme.colors.primary }]}>
                {t.refresh}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Error message */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: '#FFEBEE' }]}>
          <Ionicons name="alert-circle" size={16} color="#D32F2F" />
          <Text style={[styles.errorText, { color: '#D32F2F' }]}>{error}</Text>
        </View>
      )}

      {/* Spending Insight */}
      {spendingInsight && (
        <View
          style={[
            styles.insightCard,
            { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5' },
          ]}
        >
          <View style={styles.insightIcon}>
            <Text style={styles.insightEmoji}>💸</Text>
          </View>
          <View style={styles.insightContent}>
            <Text style={[styles.insightTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              {t.spending}
            </Text>
            <Text style={[styles.insightText, { color: isDark ? '#CCCCCC' : '#666666' }]}>
              {spendingInsight}
            </Text>
          </View>
        </View>
      )}

      {/* Trend Insight */}
      {trendInsight && (
        <View
          style={[
            styles.insightCard,
            { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5' },
          ]}
        >
          <View style={styles.insightIcon}>
            <Text style={styles.insightEmoji}>📈</Text>
          </View>
          <View style={styles.insightContent}>
            <Text style={[styles.insightTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              {t.trend}
            </Text>
            <Text style={[styles.insightText, { color: isDark ? '#CCCCCC' : '#666666' }]}>
              {trendInsight}
            </Text>
          </View>
        </View>
      )}

      {/* Cache indicator */}
      <View style={styles.cacheIndicator}>
        <Ionicons name="information-circle-outline" size={14} color="#8E8E93" />
        <Text style={styles.cacheText}>{t.cached}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 120,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
  },
  insightCard: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  insightEmoji: {
    fontSize: 20,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 12,
    lineHeight: 18,
  },
  cacheIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
    marginTop: 4,
  },
  cacheText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  lockedContainer: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  lockIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  unlockTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  unlockDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  upgradeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default AIInsightsDisplay;
