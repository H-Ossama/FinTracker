import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTutorial } from '../contexts/TutorialContext';
import { TutorialWelcomeScreen } from './TutorialWelcomeScreen';
import { TutorialOverlay } from './TutorialOverlay';

interface TutorialSystemProps {
  children: React.ReactNode;
  elementPositions?: Record<string, { x: number; y: number; width: number; height: number }>;
  onElementPressed?: (elementName: string) => void;
}

/**
 * TutorialSystem Component
 * Manages the overall tutorial flow including:
 * - Welcome screen on first login
 * - Tutorial overlay with element highlighting
 * - Navigation through tutorial steps
 * - Language support
 */
export const TutorialSystem = ({
  children,
  elementPositions = {},
  onElementPressed,
}: TutorialSystemProps) => {
  const { isAuthenticated } = useAuth();
  const {
    isTutorialActive,
    shouldShowWelcomeScreen,
    startTutorial,
    nextStep,
    skipTutorial,
    currentStepData,
  } = useTutorial();
  const [showWelcome, setShowWelcome] = useState(false);

  // Show welcome screen when user first logs in
  useEffect(() => {
    if (isAuthenticated && shouldShowWelcomeScreen()) {
      setShowWelcome(true);
    }
  }, [isAuthenticated]);

  const handleWelcomeStart = () => {
    setShowWelcome(false);
    startTutorial();
  };

  const handleWelcomeSkip = () => {
    setShowWelcome(false);
    skipTutorial();
  };

  const handleTutorialNext = () => {
    nextStep();
  };

  const handleTutorialSkip = () => {
    skipTutorial();
  };

  const handleElementTap = () => {
    const elementName = currentStepData?.elementName;
    if (elementName) {
      onElementPressed?.(elementName);
      // Auto-advance if action is 'tap' or 'both'
      if (currentStepData?.action === 'tap' || currentStepData?.action === 'both') {
        handleTutorialNext();
      }
    }
  };

  const currentElementPosition = currentStepData
    ? elementPositions[currentStepData.elementName]
    : undefined;

  return (
    <View style={{ flex: 1 }}>
      {/* Main app content */}
      {children}

      {/* Welcome screen overlay */}
      {showWelcome && isAuthenticated && (
        <TutorialWelcomeScreen
          onStart={handleWelcomeStart}
          onSkip={handleWelcomeSkip}
        />
      )}

      {/* Tutorial overlay with element highlighting */}
      {isTutorialActive && isAuthenticated && (
        <TutorialOverlay
          elementPosition={currentElementPosition}
          onElementPress={handleElementTap}
          onNextPress={handleTutorialNext}
          onSkipPress={handleTutorialSkip}
        />
      )}
    </View>
  );
};
