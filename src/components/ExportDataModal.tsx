import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';

export type ExportOption = 'pdf' | 'json' | 'excel';

type Props = {
  visible: boolean;
  isProcessing?: boolean;
  onClose: () => void;
  onSelect: (option: ExportOption) => void | Promise<void>;
};

const ExportDataModal: React.FC<Props> = ({ visible, isProcessing = false, onClose, onSelect }) => {
  const { theme, isDark } = useTheme();
  const { t } = useLocalization();
  const styles = createStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <LinearGradient
            colors={isDark ? ['#1F2937', '#111827'] : ['#FFFFFF', '#F8FAFC']}
            style={styles.sheetGradient}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerIcon}>
                <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.colors.text }]}>{t('exportData.title') || 'Export Data'}</Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                  {t('more_screen_pdf_csv_excel') || 'PDF / JSON / Excel'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.options}>
              <ExportOptionRow
                title="PDF"
                description={t('exportData.pdf') || 'Beautiful report (shareable)'}
                icon="document-text-outline"
                disabled={isProcessing}
                onPress={() => onSelect('pdf')}
              />
              <ExportOptionRow
                title="JSON"
                description={t('exportData.json') || 'Full backup (recommended)'}
                icon="code-slash-outline"
                disabled={isProcessing}
                onPress={() => onSelect('json')}
              />
              <ExportOptionRow
                title="Excel"
                description={t('exportData.excel') || 'Spreadsheet (.xlsx)'}
                icon="grid-outline"
                disabled={isProcessing}
                onPress={() => onSelect('excel')}
              />
            </View>

            <View style={styles.footerRow}>
              {isProcessing ? (
                <View style={styles.processingRow}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={[styles.processingText, { color: theme.colors.textSecondary }]}>
                    {t('exportData.exporting') || 'Preparing your export…'}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                  {t('exportData.hint') || 'Your data stays on your device. We only generate a file to share.'}
                </Text>
              )}
            </View>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const ExportOptionRow: React.FC<{
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  onPress: () => void;
}> = ({ title, description, icon, disabled, onPress }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <TouchableOpacity
      style={[styles.optionRow, disabled && { opacity: 0.6 }]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <View style={styles.optionLeft}>
        <View style={[styles.optionIcon, { backgroundColor: theme.colors.primary + '15' }]}
        >
          <Ionicons name={icon} size={18} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.optionTitle, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.optionDesc, { color: theme.colors.textSecondary }]}>{description}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
      padding: 16,
    },
    sheet: {
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sheetGradient: {
      padding: 16,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    headerIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
    },
    subtitle: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: '600',
    },
    options: {
      gap: 10,
      marginTop: 4,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      marginRight: 10,
    },
    optionIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionTitle: {
      fontSize: 14,
      fontWeight: '800',
    },
    optionDesc: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: '600',
    },
    footerRow: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    hint: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
    },
    processingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    processingText: {
      fontSize: 12,
      fontWeight: '700',
    },
  });

export default ExportDataModal;
