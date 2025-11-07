import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalization } from './LocalizationContext';

export interface TutorialStep {
  id: string;
  elementName: string;
  title: string;
  description: string;
  position?: { x: number; y: number; width: number; height: number };
  highlightElement?: boolean;
  action?: 'next' | 'tap' | 'both';
  order: number;
}

export interface TutorialContextType {
  isTutorialActive: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: TutorialStep | null;
  hasCompletedTutorial: boolean;
  startTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  completeTutorial: () => void;
  skipTutorial: () => void;
  resetTutorial: () => void;
  shouldShowWelcomeScreen: () => boolean;
  getTutorialSteps: () => TutorialStep[];
}

const TutorialContext = createContext<TutorialContextType | null>(null);

const TUTORIAL_STORAGE_KEY = 'tutorial_completed';
const TUTORIAL_WELCOME_KEY = 'tutorial_welcome_shown';

export const useTutorial = (): TutorialContextType => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

export const TutorialProvider = ({ children }: { children: ReactNode }) => {
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);
  const [welcomeShown, setWelcomeShown] = useState(false);
  const { language } = useLocalization();

  // Tutorial steps with language support
  const getTutorialSteps = (): TutorialStep[] => {
    const steps: Record<string, TutorialStep[]> = {
      en: [
        {
          id: 'welcome',
          elementName: 'welcome_screen',
          title: 'Welcome to FinTracker!',
          description: 'Let\'s take a quick tour to help you get started with managing your finances.',
          order: 0,
          action: 'next',
        },
        {
          id: 'language_currency',
          elementName: 'language_currency_button',
          title: 'Change Language & Currency',
          description: 'First, let\'s set your preferred language and currency. Tap here to customize these settings.',
          order: 1,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'add_expense',
          elementName: 'add_expense_button',
          title: 'Add Expenses',
          description: 'Track your spending by adding expenses. Tap this button to record what you spend.',
          order: 2,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'add_income',
          elementName: 'add_income_button',
          title: 'Add Income',
          description: 'Record your income sources here. Keep track of all your earnings.',
          order: 3,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'wallets',
          elementName: 'wallets_tab',
          title: 'Manage Wallets',
          description: 'Create and manage multiple wallets for different money sources. Each wallet tracks its own balance.',
          order: 4,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'insights',
          elementName: 'insights_tab',
          title: 'View Insights',
          description: 'Get detailed analytics about your spending patterns. See where your money goes.',
          order: 5,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'settings',
          elementName: 'more_tab',
          title: 'More Features',
          description: 'Access additional tools like budgets, savings goals, bills, and settings.',
          order: 6,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'complete',
          elementName: 'home_screen',
          title: 'All Set!',
          description: 'You\'re ready to start managing your finances. Begin by adding your first transaction!',
          order: 7,
          action: 'next',
        },
      ],
      de: [
        {
          id: 'welcome',
          elementName: 'welcome_screen',
          title: 'Willkommen bei FinTracker!',
          description: 'Lassen Sie uns einen schnellen Rundgang machen, um Ihnen beim Einstieg in die Verwaltung Ihrer Finanzen zu helfen.',
          order: 0,
          action: 'next',
        },
        {
          id: 'language_currency',
          elementName: 'language_currency_button',
          title: 'Sprache & Währung ändern',
          description: 'Legen Sie zunächst Ihre bevorzugte Sprache und Währung fest. Tippen Sie hier, um diese Einstellungen anzupassen.',
          order: 1,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'add_expense',
          elementName: 'add_expense_button',
          title: 'Ausgaben hinzufügen',
          description: 'Verfolgen Sie Ihre Ausgaben, indem Sie Ausgaben hinzufügen. Tippen Sie auf diese Schaltfläche, um zu erfassen, was Sie ausgeben.',
          order: 2,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'add_income',
          elementName: 'add_income_button',
          title: 'Einkommen hinzufügen',
          description: 'Erfassen Sie Ihre Einkommensquellen hier. Verfolgen Sie alle Ihre Einnahmen.',
          order: 3,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'wallets',
          elementName: 'wallets_tab',
          title: 'Geldbörsen verwalten',
          description: 'Erstellen und verwalten Sie mehrere Geldbörsen für verschiedene Geldquellen. Jede Geldbörse verfolgt ihr eigenes Guthaben.',
          order: 4,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'insights',
          elementName: 'insights_tab',
          title: 'Einblicke anzeigen',
          description: 'Erhalten Sie detaillierte Analysen zu Ihren Ausgabenmustern. Sehen Sie, wohin Ihr Geld fließt.',
          order: 5,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'settings',
          elementName: 'more_tab',
          title: 'Weitere Funktionen',
          description: 'Zugriff auf zusätzliche Tools wie Budgets, Sparziele, Rechnungen und Einstellungen.',
          order: 6,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'complete',
          elementName: 'home_screen',
          title: 'Alles bereit!',
          description: 'Sie sind bereit, Ihre Finanzen zu verwalten. Beginnen Sie mit Ihrer ersten Transaktion!',
          order: 7,
          action: 'next',
        },
      ],
      ar: [
        {
          id: 'welcome',
          elementName: 'welcome_screen',
          title: 'أهلا بك في FinTracker!',
          description: 'دعنا نأخذ جولة سريعة لمساعدتك على البدء في إدارة أموالك.',
          order: 0,
          action: 'next',
        },
        {
          id: 'language_currency',
          elementName: 'language_currency_button',
          title: 'تغيير اللغة والعملة',
          description: 'أولاً، لنحدد لغتك وعملتك المفضلة. اضغط هنا لتخصيص هذه الإعدادات.',
          order: 1,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'add_expense',
          elementName: 'add_expense_button',
          title: 'إضافة المصروفات',
          description: 'تتبع نفقاتك بإضافة المصروفات. اضغط على هذا الزر لتسجيل ما تنفقه.',
          order: 2,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'add_income',
          elementName: 'add_income_button',
          title: 'إضافة الدخل',
          description: 'سجل مصادر دخلك هنا. تتبع جميع أرباحك.',
          order: 3,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'wallets',
          elementName: 'wallets_tab',
          title: 'إدارة المحافظ',
          description: 'أنشئ وأدر محافظ متعددة لمصادر أموال مختلفة. تتبع كل محفظة رصيدها الخاص.',
          order: 4,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'insights',
          elementName: 'insights_tab',
          title: 'عرض الإحصائيات',
          description: 'احصل على تحليلات تفصيلية لأنماط نفقاتك. انظر إلى أين يذهب أموالك.',
          order: 5,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'settings',
          elementName: 'more_tab',
          title: 'ميزات إضافية',
          description: 'الوصول إلى أدوات إضافية مثل الميزانيات والأهداف والفواتير والإعدادات.',
          order: 6,
          action: 'both',
          highlightElement: true,
        },
        {
          id: 'complete',
          elementName: 'home_screen',
          title: 'كل شيء جاهز!',
          description: 'أنت مستعد لبدء إدارة أموالك. ابدأ بإضافة معاملتك الأولى!',
          order: 7,
          action: 'next',
        },
      ],
    };

    return steps[language] || steps.en;
  };

  // Load tutorial state from storage
  useEffect(() => {
    const loadTutorialState = async () => {
      try {
        const completed = await AsyncStorage.getItem(TUTORIAL_STORAGE_KEY);
        const welcomeShown = await AsyncStorage.getItem(TUTORIAL_WELCOME_KEY);
        
        if (completed === 'true') {
          setHasCompletedTutorial(true);
        }
        if (welcomeShown === 'true') {
          setWelcomeShown(true);
        }
      } catch (error) {
        console.error('Error loading tutorial state:', error);
      }
    };

    loadTutorialState();
  }, []);

  const currentStepData = getTutorialSteps()[currentStep] || null;
  const totalSteps = getTutorialSteps().length;

  const startTutorial = () => {
    setIsTutorialActive(true);
    setCurrentStep(0);
  };

  const nextStep = async () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await completeTutorial();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTutorial = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      await AsyncStorage.setItem(TUTORIAL_WELCOME_KEY, 'true');
      setHasCompletedTutorial(true);
      setIsTutorialActive(false);
    } catch (error) {
      console.error('Error completing tutorial:', error);
    }
  };

  const skipTutorial = async () => {
    await completeTutorial();
  };

  const resetTutorial = async () => {
    try {
      await AsyncStorage.removeItem(TUTORIAL_STORAGE_KEY);
      await AsyncStorage.removeItem(TUTORIAL_WELCOME_KEY);
      setHasCompletedTutorial(false);
      setWelcomeShown(false);
      setIsTutorialActive(false);
      setCurrentStep(0);
    } catch (error) {
      console.error('Error resetting tutorial:', error);
    }
  };

  const shouldShowWelcomeScreen = (): boolean => {
    return !hasCompletedTutorial && !welcomeShown;
  };

  const value: TutorialContextType = {
    isTutorialActive,
    currentStep,
    totalSteps,
    currentStepData,
    hasCompletedTutorial,
    startTutorial,
    nextStep,
    previousStep,
    completeTutorial,
    skipTutorial,
    resetTutorial,
    shouldShowWelcomeScreen,
    getTutorialSteps,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};
