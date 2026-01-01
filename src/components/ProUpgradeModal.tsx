import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useSubscription, FeatureType, SUBSCRIPTION_PRICING } from '../contexts/SubscriptionContext';
import { navigate } from '../navigation/navigationService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FeatureInfo {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const getFeatureInfo = (feature: FeatureType | undefined, language: string): FeatureInfo => {
  const features: Record<string, Record<FeatureType, FeatureInfo>> = {
    en: {
      wallets: {
        icon: 'wallet',
        title: 'Unlimited Wallets',
        description: 'Create as many wallets as you need to organize your finances.',
      },
      transactions: {
        icon: 'receipt',
        title: 'Unlimited Transactions',
        description: 'Track every expense and income without limits.',
      },
      goals: {
        icon: 'flag',
        title: 'Unlimited Goals',
        description: 'Set multiple savings goals and track your progress.',
      },
      budgets: {
        icon: 'pie-chart',
        title: 'Unlimited Budgets',
        description: 'Create detailed budgets for every category.',
      },
      bills: {
        icon: 'calendar',
        title: 'Unlimited Bills',
        description: 'Never miss a bill payment with unlimited tracking.',
      },
      reminders: {
        icon: 'notifications',
        title: 'Unlimited Reminders',
        description: 'Set as many reminders as you need.',
      },
      cloudBackup: {
        icon: 'cloud-upload',
        title: 'Cloud Backup',
        description: 'Securely backup your data to the cloud.',
      },
      exportData: {
        icon: 'download',
        title: 'Export Data',
        description: 'Export your financial data to CSV or PDF.',
      },
      advancedInsights: {
        icon: 'analytics',
        title: 'Advanced Insights',
        description: 'Get detailed analytics and spending patterns.',
      },
      customCategories: {
        icon: 'pricetag',
        title: 'Custom Categories',
        description: 'Create your own expense and income categories.',
      },
      multiCurrency: {
        icon: 'globe',
        title: 'Multi-Currency',
        description: 'Track expenses in multiple currencies.',
      },
    },
    de: {
      wallets: {
        icon: 'wallet',
        title: 'Unbegrenzte Geldbörsen',
        description: 'Erstellen Sie so viele Geldbörsen wie Sie brauchen.',
      },
      transactions: {
        icon: 'receipt',
        title: 'Unbegrenzte Transaktionen',
        description: 'Verfolgen Sie alle Ausgaben und Einnahmen.',
      },
      goals: {
        icon: 'flag',
        title: 'Unbegrenzte Ziele',
        description: 'Setzen Sie mehrere Sparziele und verfolgen Sie Ihren Fortschritt.',
      },
      budgets: {
        icon: 'pie-chart',
        title: 'Unbegrenzte Budgets',
        description: 'Erstellen Sie detaillierte Budgets für jede Kategorie.',
      },
      bills: {
        icon: 'calendar',
        title: 'Unbegrenzte Rechnungen',
        description: 'Verpassen Sie keine Rechnung mit unbegrenzter Verfolgung.',
      },
      reminders: {
        icon: 'notifications',
        title: 'Unbegrenzte Erinnerungen',
        description: 'Stellen Sie so viele Erinnerungen ein wie Sie brauchen.',
      },
      cloudBackup: {
        icon: 'cloud-upload',
        title: 'Cloud-Backup',
        description: 'Sichern Sie Ihre Daten sicher in der Cloud.',
      },
      exportData: {
        icon: 'download',
        title: 'Daten exportieren',
        description: 'Exportieren Sie Ihre Finanzdaten als CSV oder PDF.',
      },
      advancedInsights: {
        icon: 'analytics',
        title: 'Erweiterte Einblicke',
        description: 'Erhalten Sie detaillierte Analysen und Ausgabenmuster.',
      },
      customCategories: {
        icon: 'pricetag',
        title: 'Benutzerdefinierte Kategorien',
        description: 'Erstellen Sie Ihre eigenen Kategorien.',
      },
      multiCurrency: {
        icon: 'globe',
        title: 'Multi-Währung',
        description: 'Verfolgen Sie Ausgaben in mehreren Währungen.',
      },
    },
    fr: {
      wallets: {
        icon: 'wallet',
        title: 'Portefeuilles illimités',
        description: 'Créez autant de portefeuilles que nécessaire pour organiser vos finances.',
      },
      transactions: {
        icon: 'receipt',
        title: 'Transactions illimitées',
        description: 'Suivez chaque dépense et revenu sans limites.',
      },
      goals: {
        icon: 'flag',
        title: 'Objectifs illimités',
        description: 'Définissez plusieurs objectifs d\'épargne et suivez vos progrès.',
      },
      budgets: {
        icon: 'pie-chart',
        title: 'Budgets illimités',
        description: 'Créez des budgets détaillés pour chaque catégorie.',
      },
      bills: {
        icon: 'calendar',
        title: 'Factures illimitées',
        description: 'Ne manquez jamais un paiement de facture avec un suivi illimité.',
      },
      reminders: {
        icon: 'notifications',
        title: 'Rappels illimités',
        description: 'Définissez autant de rappels que nécessaire.',
      },
      cloudBackup: {
        icon: 'cloud-upload',
        title: 'Sauvegarde cloud',
        description: 'Sauvegardez vos données en toute sécurité dans le cloud.',
      },
      exportData: {
        icon: 'download',
        title: 'Exporter les données',
        description: 'Exportez vos données financières au format CSV ou PDF.',
      },
      advancedInsights: {
        icon: 'analytics',
        title: 'Aperçus avancés',
        description: 'Obtenez des analyses détaillées et des modèles de dépenses.',
      },
      customCategories: {
        icon: 'pricetag',
        title: 'Catégories personnalisées',
        description: 'Créez vos propres catégories de dépenses et de revenus.',
      },
      multiCurrency: {
        icon: 'globe',
        title: 'Multi-devises',
        description: 'Suivez les dépenses dans plusieurs devises.',
      },
    },
    ar: {
      wallets: {
        icon: 'wallet',
        title: 'محافظ غير محدودة',
        description: 'أنشئ عددًا غير محدود من المحافظ لتنظيم أموالك.',
      },
      transactions: {
        icon: 'receipt',
        title: 'معاملات غير محدودة',
        description: 'تتبع كل نفقاتك ودخلك بدون حدود.',
      },
      goals: {
        icon: 'flag',
        title: 'أهداف غير محدودة',
        description: 'حدد أهداف توفير متعددة وتتبع تقدمك.',
      },
      budgets: {
        icon: 'pie-chart',
        title: 'ميزانيات غير محدودة',
        description: 'أنشئ ميزانيات مفصلة لكل فئة.',
      },
      bills: {
        icon: 'calendar',
        title: 'فواتير غير محدودة',
        description: 'لا تفوت أي دفعة فاتورة مع التتبع غير المحدود.',
      },
      reminders: {
        icon: 'notifications',
        title: 'تذكيرات غير محدودة',
        description: 'اضبط عددًا غير محدود من التذكيرات.',
      },
      cloudBackup: {
        icon: 'cloud-upload',
        title: 'النسخ الاحتياطي السحابي',
        description: 'احتفظ بنسخة احتياطية من بياناتك بأمان في السحابة.',
      },
      exportData: {
        icon: 'download',
        title: 'تصدير البيانات',
        description: 'صدّر بياناتك المالية إلى CSV أو PDF.',
      },
      advancedInsights: {
        icon: 'analytics',
        title: 'تحليلات متقدمة',
        description: 'احصل على تحليلات مفصلة وأنماط الإنفاق.',
      },
      customCategories: {
        icon: 'pricetag',
        title: 'فئات مخصصة',
        description: 'أنشئ فئاتك الخاصة للنفقات والدخل.',
      },
      multiCurrency: {
        icon: 'globe',
        title: 'عملات متعددة',
        description: 'تتبع النفقات بعملات متعددة.',
      },
    },
  };

  const langFeatures = features[language] || features.en;
  
  if (!feature) {
    return {
      icon: 'diamond',
      title: 'Upgrade to Pro',
      description: 'Unlock all premium features',
    };
  }
  
  return langFeatures[feature] || langFeatures.wallets;
};

const ProUpgradeModal: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { language } = useLocalization();
  const insets = useSafeAreaInsets();
  const { 
    upgradeModalVisible, 
    hideUpgradeModal, 
    upgradeModalFeature, 
    upgradeModalMessage,
    billingPeriod,
  } = useSubscription();
  
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (upgradeModalVisible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [upgradeModalVisible]);

  const featureInfo = getFeatureInfo(upgradeModalFeature, language);
  const isRTL = language === 'ar';

  const texts = {
    en: {
      title: 'Upgrade to Pro ⭐',
      subtitle: 'Unlock the full power of FinTracker',
      limitReached: 'You\'ve reached the free limit',
      upgradeButton: 'Upgrade Now',
      laterButton: 'Maybe Later',
      features: [
        'Unlimited wallets, goals & budgets',
        'Cloud backup & sync',
        'Advanced insights & reports',
        'Export data to CSV/PDF',
        'Custom categories',
        'Priority support',
      ],
    },
    de: {
      title: 'Auf Pro upgraden ⭐',
      subtitle: 'Schalten Sie die volle Leistung frei',
      limitReached: 'Sie haben das kostenlose Limit erreicht',
      upgradeButton: 'Jetzt upgraden',
      laterButton: 'Vielleicht später',
      features: [
        'Unbegrenzte Geldbörsen, Ziele & Budgets',
        'Cloud-Backup & Sync',
        'Erweiterte Einblicke & Berichte',
        'Daten als CSV/PDF exportieren',
        'Benutzerdefinierte Kategorien',
        'Prioritäts-Support',
      ],
    },
    fr: {
      title: 'Passer à Pro ⭐',
      subtitle: 'Débloquez toute la puissance de FinTracker',
      limitReached: 'Vous avez atteint la limite gratuite',
      upgradeButton: 'Mettre à niveau maintenant',
      laterButton: 'Peut-être plus tard',
      features: [
        'Portefeuilles, objectifs et budgets illimités',
        'Sauvegarde et synchronisation cloud',
        'Aperçus et rapports avancés',
        'Exporter les données en CSV/PDF',
        'Catégories personnalisées',
        'Support prioritaire',
      ],
    },
    ar: {
      title: '⭐ الترقية إلى Pro',
      subtitle: 'افتح كامل قوة FinTracker',
      limitReached: 'لقد وصلت إلى الحد المجاني',
      upgradeButton: 'ترقية الآن',
      laterButton: 'ربما لاحقًا',
      features: [
        'محافظ وأهداف وميزانيات غير محدودة',
        'النسخ الاحتياطي السحابي والمزامنة',
        'تحليلات وتقارير متقدمة',
        'تصدير البيانات إلى CSV/PDF',
        'فئات مخصصة',
        'دعم ذو أولوية',
      ],
    },
  };

  const t = texts[language as keyof typeof texts] || texts.en;

  const handleUpgrade = () => {
    hideUpgradeModal();
    // Navigate to subscription screen for full upgrade flow
    navigate('Subscription');
  };

  // Get the starting price text
  const startingPrice = SUBSCRIPTION_PRICING.yearly.monthlyEquivalent;

  return (
    <Modal
      visible={upgradeModalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={hideUpgradeModal}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <LinearGradient
            colors={isDark ? ['#1F1F23', '#0F0F12'] : ['#FFFFFF', '#F8F9FA']}
            style={[styles.modal, { paddingBottom: Math.max(insets.bottom, 20) }]}
          >
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={hideUpgradeModal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={isDark ? '#8E8E93' : '#666'} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <LinearGradient
                colors={['#F59E0B', '#EF4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Ionicons name={featureInfo.icon} size={40} color="#FFFFFF" />
              </LinearGradient>

              <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1F2937' }]}>
                {t.title}
              </Text>
              
              <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {t.subtitle}
              </Text>
            </View>

            {/* Limit message */}
            {upgradeModalMessage && (
              <View style={[styles.limitBadge, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="warning" size={16} color="#D97706" />
                <Text style={[styles.limitText, { color: '#92400E', textAlign: isRTL ? 'right' : 'left' }]}>
                  {upgradeModalMessage || t.limitReached}
                </Text>
              </View>
            )}

            {/* Features list */}
            <ScrollView style={styles.featuresList} showsVerticalScrollIndicator={false}>
              {t.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <View style={[styles.checkCircle, { backgroundColor: '#10B981' }]}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.featureText, { color: isDark ? '#E5E7EB' : '#374151', textAlign: isRTL ? 'right' : 'left' }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              {/* Starting price text */}
              <Text style={[styles.startingPrice, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                Starting at {startingPrice} (billed yearly)
              </Text>
              
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={handleUpgrade}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#F59E0B', '#EF4444']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.upgradeButtonGradient}
                >
                  <Ionicons name="diamond" size={20} color="#FFFFFF" />
                  <Text style={styles.upgradeButtonText}>{t.upgradeButton}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.laterButton, { borderColor: isDark ? '#374151' : '#D1D5DB' }]}
                onPress={hideUpgradeModal}
              >
                <Text style={[styles.laterButtonText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                  {t.laterButton}
                </Text>
              </TouchableOpacity>
              
              {/* Trust signals */}
              <Text style={[styles.trustText, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                Cancel anytime · Managed via Google Play
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: screenHeight * 0.85,
  },
  modal: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  limitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 20,
    gap: 8,
  },
  limitText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  featuresList: {
    maxHeight: 200,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  buttonsContainer: {
    gap: 12,
  },
  startingPrice: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  upgradeButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  laterButton: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  trustText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ProUpgradeModal;
