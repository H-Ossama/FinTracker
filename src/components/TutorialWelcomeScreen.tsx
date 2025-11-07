import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useTutorial } from '../contexts/TutorialContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface TutorialWelcomeScreenProps {
  onStart: () => void;
  onSkip: () => void;
}

export const TutorialWelcomeScreen = ({ onStart, onSkip }: TutorialWelcomeScreenProps) => {
  const { theme, isDark } = useTheme();
  const { t, language } = useLocalization();
  const { totalSteps } = useTutorial();

  const isRTL = language === 'ar';

  const welcomeTexts = {
    en: {
      welcome: 'Welcome to FinTracker!',
      subtitle: 'Master Your Money',
      description: 'Learn how to track expenses, manage wallets, set savings goals, and take control of your financial future.',
      steps: `Complete a ${totalSteps}-step tutorial to get started`,
      start: 'Start Tutorial',
      skip: 'Skip',
    },
    de: {
      welcome: 'Willkommen bei FinTracker!',
      subtitle: 'Meistern Sie Ihr Geld',
      description: 'Erfahren Sie, wie Sie Ausgaben verfolgen, Geldbörsen verwalten, Sparziele setzen und Ihre finanzielle Zukunft kontrollieren.',
      steps: `Absolvieren Sie ein ${totalSteps}-Schritte-Tutorial um zu beginnen`,
      start: 'Tutorial starten',
      skip: 'Überspringen',
    },
    ar: {
      welcome: 'أهلا بك في FinTracker!',
      subtitle: 'إتقن أموالك',
      description: 'تعرف على كيفية تتبع النفقات وإدارة المحافظ وتحديد أهداف الادخار والتحكم في مستقبلك المالي.',
      steps: `أكمل برنامج تعليمي بـ ${totalSteps} خطوات للبدء`,
      start: 'ابدأ البرنامج التعليمي',
      skip: 'تخطي',
    },
  };

  const texts = welcomeTexts[language as keyof typeof welcomeTexts] || welcomeTexts.en;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#000000' : '#FFFFFF'}
      />

      <LinearGradient
        colors={[theme.colors.primary + '20', theme.colors.primary + '08']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header with icon */}
        <View style={styles.headerSection}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: theme.colors.primary + '20',
              },
            ]}
          >
            <Ionicons name="wallet" size={48} color={theme.colors.primary} />
          </View>

          <Text
            style={[
              styles.welcomeTitle,
              {
                color: theme.colors.primary,
                fontFamily: isRTL ? 'System' : 'System',
              },
            ]}
          >
            {texts.welcome}
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: isDark ? '#EBEBF5' : '#333333',
              },
            ]}
          >
            {texts.subtitle}
          </Text>
        </View>

        {/* Features highlight */}
        <View style={styles.featuresSection}>
          {[
            { icon: 'cash-outline', title: 'Track Expenses', desc: 'Monitor where your money goes' },
            { icon: 'wallet-outline', title: 'Manage Wallets', desc: 'Multiple money sources' },
            { icon: 'trending-up-outline', title: 'View Insights', desc: 'Understand spending patterns' },
            { icon: 'target-outline', title: 'Set Goals', desc: 'Build your financial future' },
          ].map((feature, index) => (
            <View
              key={index}
              style={[
                styles.featureCard,
                {
                  backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
                  borderColor: isDark ? '#38383A' : '#E5E5EA',
                },
              ]}
            >
              <Ionicons
                name={feature.icon as any}
                size={24}
                color={theme.colors.primary}
                style={styles.featureIcon}
              />
              <View style={styles.featureContent}>
                <Text
                  style={[
                    styles.featureTitle,
                    { color: isDark ? '#FFFFFF' : '#000000' },
                  ]}
                >
                  {feature.title}
                </Text>
                <Text
                  style={[
                    styles.featureDesc,
                    { color: isDark ? '#8E8E93' : '#666666' },
                  ]}
                >
                  {feature.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text
            style={[
              styles.description,
              {
                color: isDark ? '#EBEBF5' : '#333333',
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
          >
            {texts.description}
          </Text>

          <View style={styles.stepsIndicator}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={theme.colors.primary}
            />
            <Text
              style={[
                styles.stepsText,
                { color: theme.colors.primary },
              ]}
            >
              {texts.steps}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[
              styles.skipButton,
              {
                borderColor: isDark ? '#38383A' : '#D1D1D6',
              },
            ]}
            onPress={onSkip}
          >
            <Text
              style={[
                styles.skipButtonText,
                { color: isDark ? '#8E8E93' : '#666666' },
              ]}
            >
              {texts.skip}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.startButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={onStart}
          >
            <Text style={styles.startButtonText}>{texts.start}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradient: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  featuresSection: {
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 24,
    textAlign: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
  },
  descriptionSection: {
    gap: 16,
    marginBottom: 30,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
  },
  stepsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  stepsText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  buttonSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  startButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
