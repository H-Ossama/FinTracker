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
import { simpleCloudBackupService } from '../services/simpleCloudBackupService';
import { cloudSyncDiagnostics } from '../utils/cloudSyncDiagnostics';

const SyncTestScreen: React.FC = () => {
  const { theme } = useTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [testReport, setTestReport] = useState<SyncTestReport | null>(null);

  const showDiagnostics = async () => {
    const logs = await cloudSyncDiagnostics.getAll();
    if (!logs.length) {
      Alert.alert('Cloud Backup Logs', 'No diagnostics logs recorded yet. Try a cloud backup/restore, then come back here.');
      return;
    }

    const text = logs
      .slice(-50)
      .map((l) => {
        const time = l.ts.replace('T', ' ').replace('Z', '');
        const data = l.data ? ` ${JSON.stringify(l.data)}` : '';
        return `[${time}] ${l.level.toUpperCase()}: ${l.message}${data}`;
      })
      .join('\n');

    Alert.alert(
      'Cloud Backup Logs (last 50)',
      text.length > 3500 ? text.slice(-3500) : text,
      [
        {
          text: 'Clear Logs',
          style: 'destructive',
          onPress: async () => {
            await cloudSyncDiagnostics.clear();
            Alert.alert('Cloud Backup Logs', 'Cleared.');
          },
        },
        { text: 'OK' },
      ]
    );
  };

  const runSyncTest = async () => {
    setIsRunning(true);
    setTestReport(null);

    try {
      console.log('🚀 Starting cloud backup/restore test from UI...');

      const isAuthenticated = simpleCloudBackupService.isAuthenticated();
      if (!isAuthenticated) {
        Alert.alert(
          'Authentication Required',
          'Please sign in to run the cloud backup/restore test.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('✅ Cloud backup authentication detected');

      // Run the backup/restore test (Firebase-only)
      const report = await syncTester.runCompleteSyncTest();
      setTestReport(report);
      
      // Print to console for detailed debugging
      syncTester.printTestReport(report);
      
      // Show user-friendly alert
      Alert.alert(
        report.overall ? 'Cloud Backup Test Passed! ✅' : 'Cloud Backup Test Failed ❌',
        report.overall 
          ? 'Backup and restore completed successfully. Your data can be recovered from the cloud.'
          : 'Some backup/restore operations failed. Check the details below.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Cloud backup test error:', error);
      Alert.alert('Test Error', 'Failed to run cloud backup/restore test: ' + error);
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
          Cloud Backup Test
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Test cloud backup and restore
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
              2. Backs up data to cloud storage{'\n'}
              3. Clears local data (simulates app reinstall){'\n'}
              4. Restores data from cloud storage{'\n'}
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
            {isRunning ? 'Running Test...' : 'Run Backup/Restore Test'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
          onPress={showDiagnostics}
        >
          <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.testButtonText, { color: theme.colors.text }]}>View Cloud Backup Logs</Text>
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