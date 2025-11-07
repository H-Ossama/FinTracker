/**
 * TUTORIAL INTEGRATION EXAMPLE
 * 
 * This file demonstrates how to integrate tutorial element tracking
 * in your screens. Copy this pattern to your screens.
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useTutorialElement } from '../hooks/useTutorialElement';
import { useTutorial } from '../contexts/TutorialContext';

/**
 * Example implementation in HomeScreen or any screen
 * 
 * Step 1: Import hooks
 */

export const TutorialElementExample = () => {
  const { currentStepData } = useTutorial();

  // Step 2: Create refs for each element you want to highlight in the tutorial
  const { elementRef: languageCurrencyRef, position: languageCurrencyPos, remeasure: remeasureLangCurrency } = useTutorialElement('language_currency_button');
  const { elementRef: addExpenseRef, position: addExpensePos, remeasure: remeasureAddExpense } = useTutorialElement('add_expense_button');
  const { elementRef: addIncomeRef, position: addIncomePos, remeasure: remeasureAddIncome } = useTutorialElement('add_income_button');
  const { elementRef: walletsRef, position: walletsPos, remeasure: remeasureWallets } = useTutorialElement('wallets_tab');
  const { elementRef: insightsRef, position: insightsPos, remeasure: remeasureInsights } = useTutorialElement('insights_tab');
  const { elementRef: moreRef, position: morePos, remeasure: remeasureMore } = useTutorialElement('more_tab');

  // Step 3: Create an object with all positions
  const elementPositions = {
    language_currency_button: languageCurrencyPos,
    add_expense_button: addExpensePos,
    add_income_button: addIncomePos,
    wallets_tab: walletsPos,
    insights_tab: insightsPos,
    more_tab: morePos,
  };

  // Step 4: Remeasure when tutorial step changes
  useEffect(() => {
    const remeasureAll = () => {
      remeasureLangCurrency();
      remeasureAddExpense();
      remeasureAddIncome();
      remeasureWallets();
      remeasureInsights();
      remeasureMore();
    };

    // Remeasure on step change
    remeasureAll();

    // Also remeasure on orientation changes or layout updates
    const timer = setTimeout(remeasureAll, 500);
    return () => clearTimeout(timer);
  }, [currentStepData]);

  /**
   * Step 5: Use refs in your JSX
   * 
   * Pattern:
   * ref={elementRef}
   * 
   * The ref name must match the elementName in TutorialContext
   */

  return (
    <View style={{ flex: 1 }}>
      {/* LANGUAGE & CURRENCY BUTTON */}
      <TouchableOpacity
        ref={languageCurrencyRef}
        onPress={() => {
          // Handle language settings
        }}
      >
        <Text>Language & Currency</Text>
      </TouchableOpacity>

      {/* ADD EXPENSE BUTTON */}
      <TouchableOpacity
        ref={addExpenseRef}
        onPress={() => {
          // Show add expense modal
        }}
      >
        <Text>Add Expense</Text>
      </TouchableOpacity>

      {/* ADD INCOME BUTTON */}
      <TouchableOpacity
        ref={addIncomeRef}
        onPress={() => {
          // Show add income modal
        }}
      >
        <Text>Add Income</Text>
      </TouchableOpacity>

      {/* BOTTOM TAB NAVIGATION - Wallets */}
      <TouchableOpacity
        ref={walletsRef}
        onPress={() => {
          // Navigate to wallets
        }}
      >
        <Text>Wallets Tab</Text>
      </TouchableOpacity>

      {/* BOTTOM TAB NAVIGATION - Insights */}
      <TouchableOpacity
        ref={insightsRef}
        onPress={() => {
          // Navigate to insights
        }}
      >
        <Text>Insights Tab</Text>
      </TouchableOpacity>

      {/* BOTTOM TAB NAVIGATION - More */}
      <TouchableOpacity
        ref={moreRef}
        onPress={() => {
          // Navigate to more
        }}
      >
        <Text>More Tab</Text>
      </TouchableOpacity>

      {/**
       * Step 6: Pass positions to TutorialSystem
       * 
       * In App.tsx or your root component:
       * 
       * <TutorialSystem elementPositions={elementPositions}>
       *   <YourAppContent />
       * </TutorialSystem>
       */}
    </View>
  );
};

/**
 * TUTORIAL ELEMENT MAPPING
 * 
 * These are the element names used in the tutorial steps.
 * Make sure your refs match these names exactly:
 * 
 * - language_currency_button: Settings for language and currency
 * - add_expense_button: Button to add a new expense
 * - add_income_button: Button to add income
 * - wallets_tab: Bottom tab for wallet management
 * - insights_tab: Bottom tab for analytics
 * - more_tab: Bottom tab for more features
 * - home_screen: Used for welcome and complete steps (no highlight)
 * 
 * To add a new tutorial element:
 * 1. Add the element to the screen with a ref
 * 2. Add it to elementPositions object
 * 3. Update TutorialContext.tsx with new step
 * 4. Update translations in LocalizationContext.tsx
 */

/**
 * TIPS FOR INTEGRATION
 * 
 * 1. Element must be visible and measurable
 *    - Don't use refs on hidden components
 *    - Ensure layout is complete before measuring
 * 
 * 2. Remeasure on layout changes
 *    - Orientation changes
 *    - Modal opens/closes
 *    - Dynamic content updates
 * 
 * 3. Use the correct element names
 *    - Names in TutorialContext must match ref names
 *    - Use snake_case for consistency
 * 
 * 4. Test on different screen sizes
 *    - Tooltip might need adjustment
 *    - Element highlight might be off-screen
 * 
 * 5. Consider performance
 *    - Don't create too many refs
 *    - Batch remeasure calls
 *    - Use memoization if needed
 * 
 * 6. Handle RTL layouts
 *    - Tutorial automatically handles Arabic RTL
 *    - Test with Arabic locale
 *    - Verify button alignment
 */

export default TutorialElementExample;
