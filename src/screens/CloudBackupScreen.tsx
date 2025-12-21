import React from 'react';
import { useNavigation } from '@react-navigation/native';

import { SimpleCloudBackupModal } from '../components/SimpleCloudBackupModal';

const CloudBackupScreen: React.FC = () => {
  const navigation = useNavigation();

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
