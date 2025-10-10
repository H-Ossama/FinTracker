import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
  processColor,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { analyticsService, SpendingCategory, SpendingData, Recommendation, TrendData, TrendPoint } from '../services/analyticsService';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const chartSize = width * 0.95;
const radius = 120;
const strokeWidth = 22;
const centerX = chartSize / 2;
const centerY = chartSize / 2;

const InsightsScreen = () => {
  const { theme } = useTheme();
  const { currency, formatCurrency, t, language } = useLocalization();
  
  const getCurrencySymbol = () => {
    const symbols = { USD: '$', EUR: '€', MAD: 'MAD' };
    return symbols[currency];
  };
  
  const getRecommendationTitle = (title: string) => {
    // Map common recommendation titles to translation keys
    const titleMap: { [key: string]: string } = {
      'Consider reducing utility expenses': 'consider_reducing_utility_expenses',
      'Great progress on subscriptions!': 'great_progress_on_subscriptions',
      'Try the 50/30/20 rule': 'try_the_50_30_20_rule',
      'Track your subscriptions': 'track_your_subscriptions',
      'Higher spending this month': 'higher_spending_this_month',
      'Great job saving!': 'great_job_saving',
    };
    
    return t(titleMap[title] || title.toLowerCase().replace(/[^a-z0-9]/g, '_')) || title;
  };
  
  const getRecommendationDescription = (description: string) => {
    // Handle dynamic descriptions with percentages and values
    if (description.includes('Your spending is') && description.includes('% higher than last month')) {
      const percentMatch = description.match(/(\d+)% higher/);
      const percent = percentMatch ? percentMatch[1] : '';
      return t('spending_higher_this_month').replace('{percent}', percent);
    }
    
    if (description.includes('You\'ve reduced spending by') && description.includes('% compared to last month')) {
      const percentMatch = description.match(/(\d+)% compared/);
      const percent = percentMatch ? percentMatch[1] : '';
      return t('spending_reduced_this_month').replace('{percent}', percent);
    }
    
    if (description.includes('Your utility spending is') && description.includes('% of total expenses')) {
      const percentMatch = description.match(/(\d+)% of total/);
      const percent = percentMatch ? percentMatch[1] : '';
      return t('utility_spending_percentage_tip').replace('{percent}', percent);
    }
    
    // Map exact descriptions
    const descriptionMap: { [key: string]: string } = {
      'Your utility spending is 36% of total expenses. Try switching to energy-efficient appliances.': 'utility_spending_tip',
      'You\'ve reduced subscription spending by 15% compared to last month.': 'subscription_reduction_tip',
      'Consider allocating 50% of income to needs, 30% to wants, and 20% to savings.': 'budget_rule_tip',
      'Review your recurring subscriptions and cancel those you don\'t use often.': 'subscription_review_tip',
    };
    
    return t(descriptionMap[description]) || description;
  };
  
  const getCategoryTranslation = (categoryName: string) => {
    // Map category names to translation keys
    const categoryMap: { [key: string]: string } = {
      'Bills': 'bills',
      'Bills & Utilities': 'bills',
      'Utilities': 'utilities',
      'Food': 'food',
      'Transport': 'transport',
      'Shopping': 'shopping',
      'Entertainment': 'entertainment',
      'Healthcare': 'healthcare',
      'Subscriptions': 'subscriptions',
      'Payments': 'payments',
      'Expenses': 'expenses',
      'Other': 'other',
      'Uncategorized': 'uncategorized',
    };
    
    // Try exact match first, then lowercase
    const translationKey = categoryMap[categoryName] || categoryMap[categoryName.toLowerCase()] || categoryName.toLowerCase();
    return t(translationKey) || categoryName;
  };

  const getIconForCategory = (icon: string, categoryName: string) => {
    // Map common text-based icons to emojis
    const iconMap: { [key: string]: string } = {
      'receipt': '🧾',
      'medical': '🏥',
      'call': '📞',
      'ellipsis-horizontal': '📄',
      'food': '🍔',
      'transport': '🚗',
      'shopping': '🛍️',
      'entertainment': '🎬',
      'healthcare': '🏥',
      'utilities': '💡',
      'subscriptions': '📱',
      'bills': '🧾',
      'payments': '💳',
      'other': '📄',
      'uncategorized': '🏷️',
    };
    
    // If icon is already an emoji (simple check), return it
    if (icon.length <= 2 && /[^a-zA-Z0-9\-]/.test(icon)) {
      return icon;
    }
    
    // Try to map text-based icon to emoji
    const mappedIcon = iconMap[icon.toLowerCase()] || iconMap[categoryName.toLowerCase()];
    return mappedIcon || '🏷️'; // Default fallback for uncategorized
  };
  
  const formatDate = (dateString: string, groupBy: 'day' | 'week' | 'month') => {
    const date = new Date(dateString);
    
    if (groupBy === 'day') {
      return `${date.getDate()}/${date.getMonth() + 1}`;
    } else if (groupBy === 'week') {
      return `Week ${Math.ceil(date.getDate() / 7)}`;
    } else {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthNames[date.getMonth()];
    }
  };
  
  // State variables
  const [selectedPeriod, setSelectedPeriod] = useState<'Week' | 'Month' | 'Year'>('Month');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [spendingData, setSpendingData] = useState<SpendingData | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrendView, setSelectedTrendView] = useState<'income' | 'expense' | 'net'>('expense');
  
  // Derived values
  const categories = spendingData?.categories || [];
  const totalSpent = spendingData?.totalSpent || 0;
  const statistics = spendingData?.statistics || { transactionCount: 0, averagePerDay: 0, highestCategory: 'N/A' };
  const animatedValue = new Animated.Value(0);

  // Animation effect
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, []);
  
  // Data fetching effect
  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  // Refresh data when screen comes into focus (e.g., after bill payment)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [selectedPeriod])
  );
  
  // Function to fetch data from analytics service
  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Convert UI period to API period
      const apiPeriod = selectedPeriod.toLowerCase() as 'week' | 'month' | 'year';
      
      // Determine appropriate groupBy based on period
      const groupBy = apiPeriod === 'week' ? 'day' : 
                      apiPeriod === 'month' ? 'day' : 'month';
      
      // Fetch spending data, trend data, and recommendations in parallel
      const [spendingResponse, trendResponse, recommendationsResponse] = await Promise.all([
        analyticsService.getSpendingByCategory(apiPeriod),
        analyticsService.getTrendData(apiPeriod, groupBy as 'day' | 'week' | 'month'),
        analyticsService.getRecommendations()
      ]);
      
      if (spendingResponse.success && spendingResponse.data) {
        setSpendingData(spendingResponse.data);
      } else {
        setError('Failed to load spending data');
      }
      
      if (trendResponse.success && trendResponse.data) {
        setTrendData(trendResponse.data);
      }
      
      if (recommendationsResponse.success && recommendationsResponse.data) {
        setRecommendations(recommendationsResponse.data.recommendations);
      }
    } catch (err) {
      console.error('Error fetching insights data:', err);
      setError('An error occurred while loading insights');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle pull to refresh
  const onRefresh = useCallback(() => {
    fetchData(true);
  }, [selectedPeriod]);

  // Enhanced categories with fallback colors if needed
  const enhancedCategories = categories.map((category, index) => ({
    ...category,
    color: category.color || [
      '#FF6B6B', // Modern red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#96CEB4', // Green
      '#FECA57', // Yellow
      '#FF9FF3', // Pink
      '#54A0FF', // Light blue
    ][index % 7]
  }));

  const createModernPieChart = () => {
    const circumference = 2 * Math.PI * radius;
    
    // Only add gaps when no category is selected for cleaner look
    const shouldAddGaps = !selectedCategory;
    const gapPercentage = shouldAddGaps ? 0.04 : 0; // 4% gap between segments when no selection
    const totalGaps = enhancedCategories.length * gapPercentage;
    const availablePercentage = 1 - totalGaps;
    let cumulativePercentage = 0;

    return enhancedCategories.map((category, index) => {
      // Adjust percentage to account for gaps only when no category is selected
      const adjustedPercentage = shouldAddGaps 
        ? (category.percentage / 100) * availablePercentage 
        : category.percentage / 100;
      const gapBefore = shouldAddGaps ? index * gapPercentage : 0;
      
      const strokeDasharray = `${adjustedPercentage * circumference} ${circumference}`;
      const strokeDashoffset = -(cumulativePercentage + gapBefore) * circumference;
      
      cumulativePercentage += adjustedPercentage;

      const isSelected = selectedCategory === category.id;
      const adjustedRadius = isSelected ? radius + 6 : radius;
      const adjustedStrokeWidth = isSelected ? strokeWidth + 5 : strokeWidth;

      return (
        <Circle
          key={category.id}
          cx={centerX}
          cy={centerY}
          r={adjustedRadius}
          fill="transparent"
          stroke={category.color}
          strokeWidth={adjustedStrokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${centerX} ${centerY})`}
          opacity={selectedCategory && !isSelected ? 0.3 : 1}
          onPress={() => setSelectedCategory(isSelected ? null : category.id)}
        />
      );
    });
  };

  const createCenterContent = () => {
    const selectedCat = enhancedCategories.find(cat => cat.id === selectedCategory);
    const amount = selectedCat ? selectedCat.amount.toFixed(2) : totalSpent.toFixed(2);
    
    return (
      <>
        {/* Center circle background */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={radius - strokeWidth / 2 - 10}
          fill={theme.colors.surface}
          stroke={theme.colors.border}
          strokeWidth={1}
        />
        
        {/* Top label text */}
        <SvgText
          x={centerX}
          y={centerY - 35}
          textAnchor="middle"
          fontSize="14"
          fill="#888888"
          fontWeight="500"
          fontFamily={language === 'ar' ? 'Arial' : 'System'}
        >
          {selectedCat ? getCategoryTranslation(selectedCat.name) : t('total_spent')}
        </SvgText>
        
        {/* Formatted amount with currency */}
        <SvgText
          x={centerX}
          y={centerY - 8}
          textAnchor="middle"
          fontSize={currency === 'MAD' ? "24" : "28"}
          fontWeight="bold"
          fill={theme.colors.text}
          fontFamily={language === 'ar' ? 'Arial' : 'System'}
        >
          {formatCurrency(parseFloat(amount))}
        </SvgText>
        
        {/* Bottom period text */}
        <SvgText
          x={centerX}
          y={centerY + 18}
          textAnchor="middle"
          fontSize="12"
          fill={theme.colors.textSecondary}
          fontWeight="500"
          fontFamily={language === 'ar' ? 'Arial' : 'System'}
        >
          {selectedPeriod === 'Month' ? t('this_month') : 
           selectedPeriod === 'Week' ? t('this_week') : 
           selectedPeriod === 'Year' ? t('this_year') : 
           t('this_month')}
        </SvgText>
        
        {/* Percentage for selected category */}
        {selectedCat && (
          <SvgText
            x={centerX}
            y={centerY + 38}
            textAnchor="middle"
            fontSize="16"
            fill={selectedCat.color}
            fontWeight="bold"
            fontFamily={language === 'ar' ? 'Arial' : 'System'}
          >
            {selectedCat.percentage}%
          </SvgText>
        )}
      </>
    );
  };

  const getOrderedCategories = () => {
    if (!selectedCategory) {
      return enhancedCategories;
    }
    
    const selectedCat = enhancedCategories.find(cat => cat.id === selectedCategory);
    const otherCats = enhancedCategories.filter(cat => cat.id !== selectedCategory);
    
    return selectedCat ? [selectedCat, ...otherCats] : enhancedCategories;
  };

  const renderCategoryCard = (category: any, index: number) => {
    const isSelected = selectedCategory === category.id;
    
    return (
      <TouchableOpacity 
        key={category.id} 
        style={[
          styles.categoryCard,
          { backgroundColor: theme.colors.surface },
          index % 2 === 1 && styles.categoryCardRight,
          isSelected && { 
            borderColor: category.color, 
            borderWidth: 2,
            transform: [{ scale: 1.02 }],
            shadowColor: category.color,
            shadowOpacity: 0.2,
          }
        ]}
        onPress={() => setSelectedCategory(isSelected ? null : category.id)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryHeader}>
          <View style={styles.categoryInfo}>
            <Text style={[styles.categoryAmount, { color: theme.colors.text }, isSelected && { color: category.color }]}>
              {formatCurrency(category.amount)}
            </Text>
            <Text style={[styles.categoryPercentage, { color: theme.colors.textSecondary }]}>{category.percentage}%</Text>
          </View>
          <Text style={[styles.categoryName, { color: theme.colors.text }, isSelected && { color: category.color, fontWeight: '600' }, language === 'ar' && styles.arabicText]}>
            {getCategoryTranslation(category.name)}
          </Text>
        </View>
        <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
          <Text style={[styles.categoryEmoji, language === 'ar' && styles.arabicEmoji]}>
            {getIconForCategory(category.icon || '📄', category.name)}
          </Text>
        </View>
        {isSelected && (
          <View style={[styles.selectedIndicator, { backgroundColor: category.color }]} />
        )}
      </TouchableOpacity>
    );
  };

  // Loading or error states
  const renderContent = () => {
    if (loading && !spendingData) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loaderText, { color: theme.colors.text }]}>{t('loading_insights')}</Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => fetchData(false)}
          >
            <Text style={styles.retryText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
            title={t('pull_to_refresh')}
            titleColor={theme.colors.textSecondary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{t('insights_title')}</Text>
          <TouchableOpacity 
            style={[styles.refreshButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => fetchData(true)}
            disabled={refreshing || loading}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons 
                name="refresh" 
                size={20} 
                color={theme.colors.primary} 
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View style={[styles.periodSelector, { backgroundColor: theme.colors.surface }]}>
          {(['Week', 'Month', 'Year'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                { backgroundColor: theme.colors.surface },
                selectedPeriod === period && { backgroundColor: theme.colors.primary }
              ]}
              onPress={() => setSelectedPeriod(period as 'Week' | 'Month' | 'Year')}
            >
              <Text style={[
                styles.periodText,
                selectedPeriod === period
                  ? { color: 'white' }
                  : { color: theme.colors.textSecondary }
              ]}>
                {t(period.toLowerCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {refreshing && !loading && (
          <View style={styles.overlayLoader}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.refreshingText, { color: theme.colors.textSecondary }]}>
              {t('refreshing_data')}
            </Text>
          </View>
        )}

        {loading && !refreshing && (
          <View style={styles.overlayLoader}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        )}

        {/* Pie Chart */}
        {/* Chart */}
        <View style={[styles.chartContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.chartWrapper, { backgroundColor: theme.colors.surface }]}>
            <Svg width={chartSize} height={chartSize} style={{ backgroundColor: theme.colors.surface }}>
              <Defs>
                <RadialGradient id="chartGradient" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={theme.colors.surface} stopOpacity="1" />
                  <Stop offset="100%" stopColor={theme.colors.background} stopOpacity="1" />
                </RadialGradient>
              </Defs>
              
              {/* Background circle */}
              <Circle
                cx={centerX}
                cy={centerY}
                r={radius + strokeWidth / 2 + 10}
                fill={theme.colors.surface}
                stroke={theme.colors.border}
                strokeWidth={1}
              />
              
              {createModernPieChart()}
              {createCenterContent()}
            </Svg>
            
            {/* Tap instruction */}
            {!selectedCategory && (
              <Text style={[styles.tapInstruction, { color: theme.colors.textSecondary }, language === 'ar' && styles.arabicText]}>{t('tap_segments')}</Text>
            )}
          </View>
        </View>

        {/* Spending Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }, language === 'ar' && styles.arabicText]}>{t('spending_categories')}</Text>
          <View style={styles.categoriesGrid}>
            {getOrderedCategories().map((category, index) => 
              renderCategoryCard(category, index)
            )}
          </View>
        </View>

        {/* Additional Insights */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('month_overview')}</Text>
          {/* Overview Cards */}
          <View style={[styles.overviewCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.overviewItem}>
                <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }, language === 'ar' && styles.arabicText]}>{t('total_transactions')}</Text>
                <Text style={[styles.overviewValue, { color: theme.colors.text }, language === 'ar' && styles.arabicText]}>{statistics.transactionCount}</Text>
              </View>
              <View style={[styles.overviewDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.overviewItem}>
                <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }, language === 'ar' && styles.arabicText]}>{t('average_per_day')}</Text>
                <Text style={[styles.overviewValue, { color: theme.colors.text }, language === 'ar' && styles.arabicText]}>{formatCurrency(statistics.averagePerDay)}</Text>
              </View>
              <View style={[styles.overviewDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.overviewItem}>
                <Text style={[styles.overviewLabel, { color: theme.colors.textSecondary }, language === 'ar' && styles.arabicText]}>{t('highest_category')}</Text>
                <Text style={[styles.overviewValue, { color: theme.colors.text }, language === 'ar' && styles.arabicText]}>{getCategoryTranslation(statistics.highestCategory)}</Text>
              </View>
            </View>
        </View>

        {/* Spending Trends */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('spending_trends')}</Text>
            <View style={styles.trendViewSelector}>
              <TouchableOpacity 
                style={[styles.trendViewButton, selectedTrendView === 'expense' && styles.trendViewButtonActive]} 
                onPress={() => setSelectedTrendView('expense')}
              >
                <Text style={[styles.trendViewText, 
                  selectedTrendView === 'expense' ? {color: theme.colors.primary} : {color: theme.colors.textSecondary}
                ]}>{t('expenses_trend')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.trendViewButton, selectedTrendView === 'income' && styles.trendViewButtonActive]} 
                onPress={() => setSelectedTrendView('income')}
              >
                <Text style={[styles.trendViewText, 
                  selectedTrendView === 'income' ? {color: theme.colors.primary} : {color: theme.colors.textSecondary}
                ]}>{t('income_trend')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.trendViewButton, selectedTrendView === 'net' && styles.trendViewButtonActive]} 
                onPress={() => setSelectedTrendView('net')}
              >
                <Text style={[styles.trendViewText, 
                  selectedTrendView === 'net' ? {color: theme.colors.primary} : {color: theme.colors.textSecondary}
                ]}>{t('net_trend')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {trendData ? (
            <View style={[styles.trendChartContainer, { backgroundColor: theme.colors.surface }]}>
              {trendData.trend.length > 0 ? (
                <View style={styles.chartContent}>
                  <View style={styles.chartHolder}>
                    {/* Chart representation */}
                    {trendData.trend.map((point, index) => {
                      const maxValue = Math.max(...trendData.trend.map(t => 
                        selectedTrendView === 'expense' ? t.expense : 
                        selectedTrendView === 'income' ? t.income : 
                        Math.abs(t.net)
                      ));
                      
                      const value = selectedTrendView === 'expense' ? point.expense : 
                                  selectedTrendView === 'income' ? point.income : 
                                  point.net;
                                  
                      const heightPercentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                      const barHeight = Math.max(5, (heightPercentage / 100) * 150); // min height 5px
                      
                      // Color based on value and type
                      const color = selectedTrendView === 'expense' ? '#FF6B6B' : 
                                   selectedTrendView === 'income' ? '#4ECDC4' :
                                   value >= 0 ? '#4ECDC4' : '#FF6B6B';
                      
                      return (
                        <View key={`trend-${index}`} style={styles.barContainer}>
                          <View style={[styles.barLabel]}>
                            <Text style={styles.barValue}>{formatCurrency(value)}</Text>
                          </View>
                          <View 
                            style={[styles.bar, { 
                              height: barHeight, 
                              backgroundColor: color,
                              alignSelf: selectedTrendView === 'net' && value < 0 ? 'flex-start' : 'flex-end'
                            }]}
                          />
                          <Text style={styles.barDate}>
                            {formatDate(point.date, trendData.period.groupBy)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={styles.noTrendData}>
                  <Text style={{ color: theme.colors.textSecondary }}>{t('no_trend_data')}</Text>
                </View>
              )}
              <Text style={[styles.trendCaption, { color: theme.colors.textSecondary }]}>
                {selectedTrendView === 'expense' ? t('expenses_over_time') : 
                 selectedTrendView === 'income' ? t('income_over_time') : 
                 t('net_balance_over_time')} ({t(selectedPeriod.toLowerCase())})
              </Text>
            </View>
          ) : (
            <View style={[styles.trendChartContainer, { backgroundColor: theme.colors.surface }]}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={{ color: theme.colors.textSecondary, marginTop: 10 }}>{t('loading_trend_data')}</Text>
            </View>
          )}
        </View>
        
        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('recommendations')}</Text>
          {recommendations.length > 0 ? (
            recommendations.map((recommendation, index) => (
              <View key={`recommendation-${index}`} style={[styles.recommendationCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.recommendationIcon}>
                  <Text style={styles.recommendationEmoji}>{recommendation.emoji}</Text>
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={[styles.recommendationTitle, { color: theme.colors.text }, language === 'ar' && styles.arabicText]}>
                    {getRecommendationTitle(recommendation.title)}
                  </Text>
                  <Text style={[styles.recommendationText, { color: theme.colors.textSecondary }, language === 'ar' && styles.arabicText]}>
                    {getRecommendationDescription(recommendation.description)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.recommendationCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.recommendationIcon}>
                <Text style={styles.recommendationEmoji}>📊</Text>
              </View>
              <View style={styles.recommendationContent}>
                <Text style={[styles.recommendationTitle, { color: theme.colors.text }]}>{t('no_recommendations_title')}</Text>
                <Text style={[styles.recommendationText, { color: theme.colors.textSecondary }]}>
                  {t('no_recommendations_desc')}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
        {renderContent()}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Loading and error states
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  overlayLoader: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshingText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginBottom: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  periodText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  periodTextActive: {
    color: '#333',
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  chartWrapper: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    alignItems: 'center',
  },
  tapInstruction: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    width: '48%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  categoryCardRight: {
    marginLeft: '4%',
  },
  categoryHeader: {
    flex: 1,
  },
  categoryInfo: {
    marginBottom: 8,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  categoryName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryEmoji: {
    fontSize: 18,
    textAlign: 'center',
  },
  arabicEmoji: {
    fontSize: 16,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  overviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewDivider: {
    width: 1,
    backgroundColor: '#F2F2F7',
    marginHorizontal: 16,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  recommendationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  recommendationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recommendationEmoji: {
    fontSize: 18,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendViewSelector: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 2,
  },
  trendViewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  trendViewButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  trendViewText: {
    fontSize: 12,
    fontWeight: '500',
  },
  trendChartContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5F5',
    minHeight: 230,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartContent: {
    width: '100%',
    height: 200,
    paddingTop: 10,
  },
  chartHolder: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  barValue: {
    fontSize: 9,
    color: '#8E8E93',
    fontWeight: '500',
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
  barDate: {
    fontSize: 9,
    marginTop: 6,
    color: '#8E8E93',
    fontWeight: '500',
  },
  trendCaption: {
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noTrendData: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  arabicText: {
    fontFamily: 'System',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default InsightsScreen;