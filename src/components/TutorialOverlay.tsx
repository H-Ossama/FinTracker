import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useTutorial } from '../contexts/TutorialContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface TutorialOverlayProps {
  elementPosition?: { x: number; y: number; width: number; height: number };
  onElementPress?: () => void;
  onNextPress?: () => void;
  onSkipPress?: () => void;
}

export const TutorialOverlay = ({
  elementPosition,
  onElementPress,
  onNextPress,
  onSkipPress,
}: TutorialOverlayProps) => {
  const { theme, isDark } = useTheme();
  const { t } = useLocalization();
  const { isTutorialActive, currentStepData, currentStep, totalSteps, startTutorial } = useTutorial();
  const [pulseAnim] = useState(new Animated.Value(1));
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Pulse animation for the highlight
  useEffect(() => {
    if (isTutorialActive && currentStepData?.highlightElement) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isTutorialActive, currentStepData]);

  if (!isTutorialActive || !currentStepData) return null;

  const isWelcomeStep = currentStepData.id === 'welcome';
  const isCompleteStep = currentStepData.id === 'complete';
  const hasElement = elementPosition && currentStepData.highlightElement;

  const highlightPadding = 15;
  const highlightX = elementPosition ? elementPosition.x - highlightPadding : 0;
  const highlightY = elementPosition ? elementPosition.y - highlightPadding : 0;
  const highlightWidth = elementPosition ? elementPosition.width + highlightPadding * 2 : 0;
  const highlightHeight = elementPosition ? elementPosition.height + highlightPadding * 2 : 0;
  const borderRadius = 12;

  const tooltipMaxWidth = 280;
  let tooltipX = highlightX + highlightWidth / 2 - tooltipMaxWidth / 2;
  let tooltipY = highlightY - 150;

  // Ensure tooltip stays within screen bounds
  if (tooltipX < 10) tooltipX = 10;
  if (tooltipX + tooltipMaxWidth > screenWidth - 10) tooltipX = screenWidth - tooltipMaxWidth - 10;
  if (tooltipY < 10) tooltipY = highlightY + highlightHeight + 20;

  // Tooltip arrow position
  let arrowX = highlightX + highlightWidth / 2 - tooltipX - 8;

  return (
    <Modal
      visible={isTutorialActive}
      transparent
      animationType="fade"
      pointerEvents="box-none"
      statusBarTranslucent
    >
      {/* Dark overlay */}
      <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}>
        {/* Highlight cutout */}
        {hasElement && (
          <>
            {/* Top rectangle */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: highlightY,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                pointerEvents: 'none',
              }}
            />

            {/* Left rectangle */}
            <View
              style={{
                position: 'absolute',
                top: highlightY,
                left: 0,
                width: highlightX,
                height: highlightHeight,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                pointerEvents: 'none',
              }}
            />

            {/* Right rectangle */}
            <View
              style={{
                position: 'absolute',
                top: highlightY,
                right: 0,
                width: screenWidth - (highlightX + highlightWidth),
                height: highlightHeight,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                pointerEvents: 'none',
              }}
            />

            {/* Bottom rectangle */}
            <View
              style={{
                position: 'absolute',
                top: highlightY + highlightHeight,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                pointerEvents: 'none',
              }}
            />

            {/* Highlight border with pulse effect */}
            <Animated.View
              style={[
                styles.highlightBorder,
                {
                  left: highlightX,
                  top: highlightY,
                  width: highlightWidth,
                  height: highlightHeight,
                  borderRadius,
                  borderColor: theme.colors.primary,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
              pointerEvents="none"
            />

            {/* Invisible touch area for the highlighted element */}
            <TouchableOpacity
              style={{
                position: 'absolute',
                left: highlightX,
                top: highlightY,
                width: highlightWidth,
                height: highlightHeight,
              }}
              onPress={() => {
                if (currentStepData.action === 'tap' || currentStepData.action === 'both') {
                  onElementPress?.();
                }
              }}
            />
          </>
        )}

        {/* Tooltip */}
        <View
          style={[
            styles.tooltip,
            {
              left: tooltipX,
              top: tooltipY,
              maxWidth: tooltipMaxWidth,
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderColor: theme.colors.primary,
              shadowColor: isDark ? '#000000' : '#666666',
            },
          ]}
          pointerEvents="box-none"
        >
          {/* Arrow pointer */}
          {hasElement && (
            <View
              style={[
                styles.tooltipArrow,
                {
                  left: arrowX,
                  borderBottomColor: isDark ? '#1C1C1E' : '#FFFFFF',
                },
              ]}
            />
          )}

          {/* Tooltip content */}
          <View style={styles.tooltipContent}>
            <Text
              style={[
                styles.tooltipTitle,
                { color: theme.colors.primary, fontFamily: 'System' },
              ]}
            >
              {currentStepData.title}
            </Text>

            <Text
              style={[
                styles.tooltipDescription,
                { color: isDark ? '#EBEBF5' : '#333333' },
              ]}
            >
              {currentStepData.description}
            </Text>

            {/* Step counter */}
            <Text
              style={[
                styles.stepCounter,
                { color: isDark ? '#8E8E93' : '#999999' },
              ]}
            >
              {currentStep + 1} / {totalSteps}
            </Text>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.skipButton, { borderColor: isDark ? '#38383A' : '#D1D1D6' }]}
                onPress={onSkipPress}
              >
                <Text
                  style={[
                    styles.skipButtonText,
                    { color: isDark ? '#8E8E93' : '#666666' },
                  ]}
                >
                  {isWelcomeStep ? 'Skip' : 'Quit'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
                onPress={onNextPress}
              >
                <Text style={styles.nextButtonText}>
                  {isCompleteStep ? 'Finish' : 'Next'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Tap instruction */}
            {hasElement && (currentStepData.action === 'tap' || currentStepData.action === 'both') && (
              <Text
                style={[
                  styles.tapInstruction,
                  { color: theme.colors.primary },
                ]}
              >
                💡 {t('tutorial.tap_to_continue') || 'Tap the highlighted element or press Next'}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  highlightBorder: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  tooltip: {
    position: 'absolute',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    zIndex: 1000,
  },
  tooltipArrow: {
    position: 'absolute',
    top: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  tooltipContent: {
    alignItems: 'flex-start',
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  tooltipDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  stepCounter: {
    fontSize: 12,
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tapInstruction: {
    fontSize: 12,
    marginTop: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
