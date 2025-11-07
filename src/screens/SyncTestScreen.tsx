import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { syncTester, SyncTestReport, TestResult } from '../utils/syncTester';
import { cloudSyncService } from '../services/cloudSyncService';

const SyncTestScreen: React.FC = () => {
  const { theme } = useTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [testReport, setTestReport] = useState<SyncTestReport | null>(null);

  const runSyncTest = async () => {
    setIsRunning(true);
    setTestReport(null);

    try {
      console.log('🚀 Starting cloud sync test from UI...');

      const isAuthenticated = await cloudSyncService.isAuthenticated();
      if (!isAuthenticated) {
        Alert.alert(
          'Authentication Required',
          'Please sign in and ensure cloud sync is enabled before running this test.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('✅ Cloud sync authentication detected');

      // Run the sync test against cloud backend
      const report = await syncTester.runCompleteSyncTest();
      setTestReport(report);
      
      // Print to console for detailed debugging
      syncTester.printTestReport(report);
      
      // Show user-friendly alert
      Alert.alert(
        report.overall ? 'Cloud Sync Test Passed! 🔥✅' : 'Cloud Sync Test Failed ❌',
        report.overall 
          ? 'All cloud sync operations completed successfully. Your data is safely stored on the server!'
          : 'Some cloud sync operations failed. Check the details below.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Cloud sync test error:', error);
      Alert.alert('Test Error', 'Failed to run cloud sync test: ' + error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStepIcon = (success: boolean) => {
    return success ? 'checkmark-circle' : 'close-circle';
  };

  const getStepColor = (success: boolean) => {
    return success ? '#4CAF50' : '#F44336';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Sync Test
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Test data backup and restoration
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
          <View style={styles.infoText}>
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
              What this test does:
            </Text>
            <Text style={[styles.infoDescription, { color: theme.colors.textSecondary }]}>
              1. Creates sample data (wallets, transactions, budgets){'\n'}
              2. Uploads data to cloud storage{'\n'}
              3. Clears local data (simulates app reinstall){'\n'}
              4. Downloads data from cloud storage{'\n'}
              5. Verifies data integrity
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.testButton,
            { backgroundColor: theme.colors.primary },
            isRunning && styles.disabledButton,
          ]}
          onPress={runSyncTest}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Ionicons name="play-circle" size={20} color="white" />
          )}
          <Text style={styles.testButtonText}>
            {isRunning ? 'Running Test...' : 'Run Sync Test'}
          </Text>
        </TouchableOpacity>

        {testReport && (
          <View style={[styles.resultsCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.resultsHeader}>
              <Ionicons 
                name={testReport.overall ? 'checkmark-circle' : 'close-circle'} 
                size={24} 
                color={testReport.overall ? '#4CAF50' : '#F44336'} 
              />
              <Text style={[
                styles.resultsTitle, 
                { 
                  color: testReport.overall ? '#4CAF50' : '#F44336',
                }
              ]}>
                {testReport.overall ? 'Test Passed!' : 'Test Failed'}
              </Text>
            </View>

            <View style={styles.stepsList}>
              {testReport.results.map((result: TestResult, index: number) => (
                <View key={index} style={styles.stepItem}>
                  <Ionicons
                    name={getStepIcon(result.success)}
                    size={20}
                    color={getStepColor(result.success)}
                  />
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
                      {result.step}
                    </Text>
                    {result.error && (
                      <Text style={[styles.stepError, { color: '#F44336' }]}>
                        {result.error}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            <View style={[styles.summaryCard, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
                Data Summary
              </Text>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                  Data Integrity:
                </Text>
                <Text style={[
                  styles.summaryValue,
                  { color: testReport.summary.dataMatches ? '#4CAF50' : '#F44336' }
                ]}>
                  {testReport.summary.dataMatches ? 'Verified ✅' : 'Failed ❌'}
                </Text>
              </View>
              
              {testReport.summary.originalData && (
                <>
                  <Text style={[styles.dataHeader, { color: theme.colors.text }]}>
                    Original Data:
                  </Text>
                  <Text style={[styles.dataItem, { color: theme.colors.textSecondary }]}>
                    • Wallets: {testReport.summary.originalData.wallets?.length || 0}
                  </Text>
                  <Text style={[styles.dataItem, { color: theme.colors.textSecondary }]}>
                    • Transactions: {testReport.summary.originalData.transactions?.length || 0}
                  </Text>
                  <Text style={[styles.dataItem, { color: theme.colors.textSecondary }]}>
                    • Budgets: {testReport.summary.originalData.budgets?.length || 0}
                  </Text>
                </>
              )}

              {testReport.summary.restoredData && (
                <>
                  <Text style={[styles.dataHeader, { color: theme.colors.text }]}>
                    Restored Data:
                  </Text>
                  <Text style={[styles.dataItem, { color: theme.colors.textSecondary }]}>
                    • Wallets: {testReport.summary.restoredData.wallets?.length || 0}
                  </Text>
                  <Text style={[styles.dataItem, { color: theme.colors.textSecondary }]}>
                    • Transactions: {testReport.summary.restoredData.transactions?.length || 0}
                  </Text>
                  <Text style={[styles.dataItem, { color: theme.colors.textSecondary }]}>
                    • Budgets: {testReport.summary.restoredData.budgets?.length || 0}
                  </Text>
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultsCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  stepsList: {
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepContent: {
    flex: 1,
    marginLeft: 12,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  stepError: {
    fontSize: 14,
    marginTop: 4,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  dataHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  dataItem: {
    fontSize: 14,
    marginLeft: 8,
    marginBottom: 2,
  },
});

export default SyncTestScreen;