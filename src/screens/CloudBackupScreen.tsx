import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

import { SimpleCloudBackupModal } from '../components/SimpleCloudBackupModal';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useLocalization } from '../contexts/LocalizationContext';

const CloudBackupScreen: React.FC = () => {
  const navigation = useNavigation();
  const { hasFeature, showUpgradeModal } = useSubscription();
  const { t } = useLocalization();

  useEffect(() => {
    if (!hasFeature('cloudBackup')) {
      showUpgradeModal('cloudBackup', t('subscription_pro_backup') || 'Cloud backup is available on Pro.');
      navigation.goBack();
    }
  }, [hasFeature, navigation, showUpgradeModal, t]);

  if (!hasFeature('cloudBackup')) {
    return null;
  }

  return (
    <SimpleCloudBackupModal
      // Screen mode: rendered inside stack so iOS edge-swipe back works.
      visible={true}
      mode="screen"
      onClose={() => navigation.goBack()}
    />
  );
};

export default CloudBackupScreen;
