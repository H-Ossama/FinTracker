import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
  FlatList,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ONBOARDING_COMPLETE_KEY = 'onboarding_tutorial_complete';

interface TutorialSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  title: string;
  description: string;
  tip?: string;
}

interface OnboardingTutorialProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

// Hook to check if onboarding should be shown
export const useOnboardingTutorial = () => {
  const [shouldShow, setShouldShow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
      setShouldShow(completed !== 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setShouldShow(false);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      setShouldShow(false);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
      setShouldShow(true);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  return { shouldShow, isLoading, completeOnboarding, resetOnboarding };
};

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  visible,
  onComplete,
  onSkip,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { language, t, setLanguage, setCurrency, currency } = useLocalization();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Tutorial slides with multi-language support
  const getSlides = (): TutorialSlide[] => {
    const slides: Record<string, TutorialSlide[]> = {
      en: [
        {
          id: 'language_currency',
          icon: 'globe',
          iconBg: '#2563EB',
          title: 'Language, Currency & Theme 🌍',
          description: 'Choose your preferred language, currency, and theme to get started.',
          tip: 'You can change this later in Settings',
        },
        {
          id: 'welcome',
          icon: 'wallet',
          iconBg: '#4F46E5',
          title: 'Welcome to FinTracker! 👋',
          description: 'Your personal finance companion. Track spending, manage budgets, and reach your savings goals.',
          tip: 'Swipe or tap Next to continue',
        },
        {
          id: 'expenses',
          icon: 'card',
          iconBg: '#EF4444',
          title: 'Track Your Expenses 💸',
          description: 'Easily log every purchase with categories. See where your money goes at a glance.',
          tip: 'Use the + button on home to add expenses',
        },
        {
          id: 'income',
          icon: 'trending-up',
          iconBg: '#10B981',
          title: 'Record Your Income 💰',
          description: 'Keep track of all your earnings - salary, side hustles, gifts, and more.',
          tip: 'Tap the income button to add earnings',
        },
        {
          id: 'wallets',
          icon: 'wallet-outline',
          iconBg: '#8B5CF6',
          title: 'Multiple Wallets 👛',
          description: 'Organize your money across different accounts - cash, bank, savings, and more.',
          tip: 'Go to Wallet tab to manage your accounts',
        },
        {
          id: 'insights',
          icon: 'pie-chart',
          iconBg: '#F59E0B',
          title: 'Smart Insights 📊',
          description: 'Beautiful charts show your spending patterns. Understand your habits and make better decisions.',
          tip: 'Check Insights tab for detailed analytics',
        },
        {
          id: 'goals',
          icon: 'flag',
          iconBg: '#06B6D4',
          title: 'Set Savings Goals 🎯',
          description: 'Dream of a vacation? New phone? Create goals and watch your progress grow!',
          tip: 'Find Goals in the More menu',
        },
        {
          id: 'ready',
          icon: 'rocket',
          iconBg: '#EC4899',
          title: "You're All Set! 🚀",
          description: 'Start your financial journey today. Every small step counts towards a secure future.',
          tip: 'Tap Get Started to begin!',
        },
      ],
      de: [
        {
          id: 'language_currency',
          icon: 'globe',
          iconBg: '#2563EB',
          title: 'Sprache, Währung & Design 🌍',
          description: 'Wählen Sie Ihre bevorzugte Sprache, Währung und das Design, um zu beginnen.',
          tip: 'Sie können dies später in den Einstellungen ändern',
        },
        {
          id: 'welcome',
          icon: 'wallet',
          iconBg: '#4F46E5',
          title: 'Willkommen bei FinTracker! 👋',
          description: 'Ihr persönlicher Finanzbegleiter. Verfolgen Sie Ausgaben, verwalten Sie Budgets und erreichen Sie Ihre Sparziele.',
          tip: 'Wischen oder tippen Sie auf Weiter',
        },
        {
          id: 'expenses',
          icon: 'card',
          iconBg: '#EF4444',
          title: 'Verfolgen Sie Ihre Ausgaben 💸',
          description: 'Protokollieren Sie jeden Kauf mit Kategorien. Sehen Sie auf einen Blick, wohin Ihr Geld fließt.',
          tip: 'Nutzen Sie die + Taste um Ausgaben hinzuzufügen',
        },
        {
          id: 'income',
          icon: 'trending-up',
          iconBg: '#10B981',
          title: 'Erfassen Sie Ihr Einkommen 💰',
          description: 'Behalten Sie alle Ihre Einnahmen im Blick - Gehalt, Nebenverdienste, Geschenke und mehr.',
          tip: 'Tippen Sie auf Einkommen um Einnahmen hinzuzufügen',
        },
        {
          id: 'wallets',
          icon: 'wallet-outline',
          iconBg: '#8B5CF6',
          title: 'Mehrere Geldbörsen 👛',
          description: 'Organisieren Sie Ihr Geld in verschiedenen Konten - Bargeld, Bank, Ersparnisse und mehr.',
          tip: 'Gehen Sie zum Geldbörsen-Tab',
        },
        {
          id: 'insights',
          icon: 'pie-chart',
          iconBg: '#F59E0B',
          title: 'Intelligente Einblicke 📊',
          description: 'Schöne Diagramme zeigen Ihre Ausgabenmuster. Verstehen Sie Ihre Gewohnheiten.',
          tip: 'Prüfen Sie den Einblicke-Tab für detaillierte Analysen',
        },
        {
          id: 'goals',
          icon: 'flag',
          iconBg: '#06B6D4',
          title: 'Sparziele setzen 🎯',
          description: 'Träumen Sie von einem Urlaub? Neues Handy? Erstellen Sie Ziele und verfolgen Sie Ihren Fortschritt!',
          tip: 'Finden Sie Ziele im Mehr-Menü',
        },
        {
          id: 'ready',
          icon: 'rocket',
          iconBg: '#EC4899',
          title: 'Alles bereit! 🚀',
          description: 'Starten Sie heute Ihre finanzielle Reise. Jeder kleine Schritt zählt für eine sichere Zukunft.',
          tip: 'Tippen Sie auf Loslegen!',
        },
      ],
      ar: [
        {
          id: 'language_currency',
          icon: 'globe',
          iconBg: '#2563EB',
          title: 'اللغة والعملة والمظهر 🌍',
          description: 'اختر لغتك وعملتك ومظهرك المفضل للبدء.',
          tip: 'يمكنك تغيير هذا لاحقًا في الإعدادات',
        },
        {
          id: 'welcome',
          icon: 'wallet',
          iconBg: '#4F46E5',
          title: '!أهلا بك في FinTracker 👋',
          description: 'رفيقك المالي الشخصي. تتبع الإنفاق، وأدر الميزانيات، وحقق أهداف التوفير.',
          tip: 'اسحب أو اضغط على التالي للمتابعة',
        },
        {
          id: 'expenses',
          icon: 'card',
          iconBg: '#EF4444',
          title: 'تتبع نفقاتك 💸',
          description: 'سجل كل مشترياتك بسهولة مع التصنيفات. اعرف أين تذهب أموالك.',
          tip: 'استخدم زر + لإضافة النفقات',
        },
        {
          id: 'income',
          icon: 'trending-up',
          iconBg: '#10B981',
          title: 'سجل دخلك 💰',
          description: 'تتبع جميع مداخيلك - الراتب، الأعمال الجانبية، الهدايا والمزيد.',
          tip: 'اضغط على زر الدخل لإضافة الأرباح',
        },
        {
          id: 'wallets',
          icon: 'wallet-outline',
          iconBg: '#8B5CF6',
          title: 'محافظ متعددة 👛',
          description: 'نظم أموالك عبر حسابات مختلفة - نقدي، بنكي، مدخرات والمزيد.',
          tip: 'اذهب إلى تبويب المحفظة لإدارة حساباتك',
        },
        {
          id: 'insights',
          icon: 'pie-chart',
          iconBg: '#F59E0B',
          title: 'إحصائيات ذكية 📊',
          description: 'رسوم بيانية جميلة تظهر أنماط إنفاقك. افهم عاداتك واتخذ قرارات أفضل.',
          tip: 'راجع تبويب الإحصائيات للتحليلات المفصلة',
        },
        {
          id: 'goals',
          icon: 'flag',
          iconBg: '#06B6D4',
          title: 'حدد أهداف التوفير 🎯',
          description: 'تحلم بإجازة؟ هاتف جديد؟ أنشئ أهدافاً وشاهد تقدمك ينمو!',
          tip: 'ابحث عن الأهداف في قائمة المزيد',
        },
        {
          id: 'ready',
          icon: 'rocket',
          iconBg: '#EC4899',
          title: '!أنت جاهز 🚀',
          description: 'ابدأ رحلتك المالية اليوم. كل خطوة صغيرة تهم نحو مستقبل آمن.',
          tip: '!اضغط على ابدأ للبداية',
        },
      ],
      fr: [
        {
          id: 'language_currency',
          icon: 'globe',
          iconBg: '#2563EB',
          title: 'Langue, Devise et Thème 🌍',
          description: 'Choisissez votre langue, devise et thème préférés pour commencer.',
          tip: 'Vous pourrez changer cela plus tard dans les Paramètres',
        },
        {
          id: 'welcome',
          icon: 'wallet',
          iconBg: '#4F46E5',
          title: 'Bienvenue sur FinTracker ! 👋',
          description: 'Votre compagnon financier personnel. Suivez vos dépenses, gérez vos budgets et atteignez vos objectifs d\'épargne.',
          tip: 'Glissez ou appuyez sur Suivant pour continuer',
        },
        {
          id: 'expenses',
          icon: 'card',
          iconBg: '#EF4444',
          title: 'Suivez vos dépenses 💸',
          description: 'Enregistrez facilement chaque achat avec des catégories. Voyez où va votre argent en un coup d\'œil.',
          tip: 'Utilisez le bouton + sur l\'accueil pour ajouter des dépenses',
        },
        {
          id: 'income',
          icon: 'trending-up',
          iconBg: '#10B981',
          title: 'Enregistrez vos revenus 💰',
          description: 'Gardez une trace de tous vos gains - salaire, activités secondaires, cadeaux, et plus.',
          tip: 'Appuyez sur le bouton revenu pour ajouter des gains',
        },
        {
          id: 'wallets',
          icon: 'wallet-outline',
          iconBg: '#8B5CF6',
          title: 'Portefeuilles multiples 👛',
          description: 'Organisez votre argent sur différents comptes - espèces, banque, épargne, et plus.',
          tip: 'Allez dans l\'onglet Portefeuille pour gérer vos comptes',
        },
        {
          id: 'insights',
          icon: 'pie-chart',
          iconBg: '#F59E0B',
          title: 'Aperçus intelligents 📊',
          description: 'De beaux graphiques montrent vos habitudes de dépenses. Comprenez vos habitudes et prenez de meilleures décisions.',
          tip: 'Consultez l\'onglet Aperçus pour des analyses détaillées',
        },
        {
          id: 'goals',
          icon: 'flag',
          iconBg: '#06B6D4',
          title: 'Fixez des objectifs d\'épargne 🎯',
          description: 'Vous rêvez de vacances ? D\'un nouveau téléphone ? Créez des objectifs et regardez vos progrès grandir !',
          tip: 'Trouvez Objectifs dans le menu Plus',
        },
        {
          id: 'ready',
          icon: 'rocket',
          iconBg: '#EC4899',
          title: 'Vous êtes prêt ! 🚀',
          description: 'Commencez votre voyage financier aujourd\'hui. Chaque petit pas compte pour un avenir sûr.',
          tip: 'Appuyez sur Commencer pour débuter !',
        },
      ],
    };

    return slides[language] || slides.en;
  };

  const slides = getSlides();
  const isLastSlide = currentIndex === slides.length - 1;
  const isRTL = language === 'ar';

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const renderSlide = ({ item, index }: { item: TutorialSlide; index: number }) => (
    <View style={[styles.slideContainer, { width: screenWidth }]}>
      <View style={styles.slideContent}>
        {/* Icon Circle */}
        <Animated.View
          style={[
            styles.iconCircle,
            { backgroundColor: item.iconBg },
          ]}
        >
          <Ionicons name={item.icon} size={56} color="#FFFFFF" />
        </Animated.View>

        {/* Title */}
        <Text
          style={[
            styles.slideTitle,
            { 
              color: isDark ? '#FFFFFF' : '#1F2937',
              textAlign: isRTL ? 'right' : 'center',
            },
          ]}
        >
          {item.title}
        </Text>

        {/* Description */}
        <Text
          style={[
            styles.slideDescription,
            { 
              color: isDark ? '#9CA3AF' : '#6B7280',
              textAlign: isRTL ? 'right' : 'center',
            },
          ]}
        >
          {item.description}
        </Text>

        {/* Language & Currency Selectors */}
        {item.id === 'language_currency' && (
          <View style={{ width: '100%', marginTop: 20, paddingHorizontal: 10 }}>
            <Text style={{ color: isDark ? '#FFF' : '#1F2937', fontSize: 16, fontWeight: '600', marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>
              {language === 'ar' ? 'اللغة' : (language === 'fr' ? 'Langue' : (language === 'de' ? 'Sprache' : 'Language'))}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20, justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
              {[
                { code: 'en', label: 'English', flag: '🇺🇸' },
                { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
                { code: 'ar', label: 'العربية', flag: '🇸🇦' },
                { code: 'fr', label: 'Français', flag: '🇫🇷' },
              ].map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    backgroundColor: language === lang.code ? theme.colors.primary : (isDark ? '#374151' : '#F3F4F6'),
                    borderWidth: 1,
                    borderColor: language === lang.code ? theme.colors.primary : 'transparent',
                  }}
                  onPress={() => setLanguage(lang.code as any)}
                >
                  <Text style={{ 
                    color: language === lang.code ? '#FFF' : (isDark ? '#D1D5DB' : '#4B5563'),
                    fontWeight: language === lang.code ? 'bold' : 'normal'
                  }}>
                    {lang.flag} {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: isDark ? '#FFF' : '#1F2937', fontSize: 16, fontWeight: '600', marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>
              {language === 'ar' ? 'العملة' : (language === 'fr' ? 'Devise' : (language === 'de' ? 'Währung' : 'Currency'))}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20, justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
              {[
                { code: 'USD', symbol: '$' },
                { code: 'EUR', symbol: '€' },
                { code: 'MAD', symbol: 'MAD' },
              ].map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    backgroundColor: currency === curr.code ? theme.colors.primary : (isDark ? '#374151' : '#F3F4F6'),
                    borderWidth: 1,
                    borderColor: currency === curr.code ? theme.colors.primary : 'transparent',
                  }}
                  onPress={() => setCurrency(curr.code as any)}
                >
                  <Text style={{ 
                    color: currency === curr.code ? '#FFF' : (isDark ? '#D1D5DB' : '#4B5563'),
                    fontWeight: currency === curr.code ? 'bold' : 'normal'
                  }}>
                    {curr.symbol} {curr.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: isDark ? '#FFF' : '#1F2937', fontSize: 16, fontWeight: '600', marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>
              {language === 'ar' ? 'المظهر' : (language === 'fr' ? 'Thème' : (language === 'de' ? 'Design' : 'Theme'))}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
              {[
                { id: 'light', label: language === 'ar' ? 'فاتح' : (language === 'fr' ? 'Clair' : (language === 'de' ? 'Hell' : 'Light')), icon: 'sunny' },
                { id: 'dark', label: language === 'ar' ? 'داكن' : (language === 'fr' ? 'Sombre' : (language === 'de' ? 'Dunkel' : 'Dark')), icon: 'moon' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    backgroundColor: (t.id === 'dark' && isDark) || (t.id === 'light' && !isDark) ? theme.colors.primary : (isDark ? '#374151' : '#F3F4F6'),
                    borderWidth: 1,
                    borderColor: (t.id === 'dark' && isDark) || (t.id === 'light' && !isDark) ? theme.colors.primary : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onPress={() => {
                    if ((t.id === 'dark' && !isDark) || (t.id === 'light' && isDark)) {
                      toggleTheme();
                    }
                  }}
                >
                  <Ionicons 
                    name={t.icon as any} 
                    size={16} 
                    color={(t.id === 'dark' && isDark) || (t.id === 'light' && !isDark) ? '#FFF' : (isDark ? '#D1D5DB' : '#4B5563')} 
                  />
                  <Text style={{ 
                    color: (t.id === 'dark' && isDark) || (t.id === 'light' && !isDark) ? '#FFF' : (isDark ? '#D1D5DB' : '#4B5563'),
                    fontWeight: (t.id === 'dark' && isDark) || (t.id === 'light' && !isDark) ? 'bold' : 'normal'
                  }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Tip */}
        {item.tip && item.id !== 'language_currency' && (
          <View style={[styles.tipContainer, { backgroundColor: theme.colors.primary + '15' }]}>
            <Ionicons name="bulb" size={18} color={theme.colors.primary} />
            <Text
              style={[
                styles.tipText,
                { 
                  color: theme.colors.primary,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
            >
              {item.tip}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  // Pagination dots
  const renderPagination = () => (
    <View style={styles.pagination}>
      {slides.map((_, index) => {
        const inputRange = [
          (index - 1) * screenWidth,
          index * screenWidth,
          (index + 1) * screenWidth,
        ];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });

        const dotOpacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.4, 1, 0.4],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity: dotOpacity,
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
        );
      })}
    </View>
  );

  const getButtonText = () => {
    if (isLastSlide) {
      const texts: Record<string, string> = {
        en: 'Get Started',
        de: 'Loslegen',
        ar: 'ابدأ الآن',
      };
      return texts[language] || texts.en;
    }
    const texts: Record<string, string> = {
      en: 'Next',
      de: 'Weiter',
      ar: 'التالي',
    };
    return texts[language] || texts.en;
  };

  const getSkipText = () => {
    const texts: Record<string, string> = {
      en: 'Skip',
      de: 'Überspringen',
      ar: 'تخطي',
    };
    return texts[language] || texts.en;
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        {/* Skip button */}
        {!isLastSlide && (
          <TouchableOpacity
            style={[styles.skipButton, { top: insets.top + 16 }]}
            onPress={handleSkip}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.skipText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {getSkipText()}
            </Text>
          </TouchableOpacity>
        )}

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          scrollEventThrottle={16}
          contentContainerStyle={styles.flatListContent}
        />

        {/* Bottom section */}
        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 20) + 10 }]}>
          {renderPagination()}

          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
            onPress={goToNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>{getButtonText()}</Text>
            <Ionicons 
              name={isLastSlide ? 'checkmark' : 'arrow-forward'} 
              size={20} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  flatListContent: {
    paddingTop: 80,
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  slideContent: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 80,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  slideDescription: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  tipText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 32,
    gap: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default OnboardingTutorial;
