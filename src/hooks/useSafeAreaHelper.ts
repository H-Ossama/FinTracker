import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, StatusBar } from 'react-native';

export const useSafeAreaHelper = () => {
  const insets = useSafeAreaInsets();
  
  // Additional padding for different platforms
  const getStatusBarHeight = () => {
    if (Platform.OS === 'ios') {
      return insets.top;
    }
    return StatusBar.currentHeight || 0;
  };

  const getSafeAreaPadding = () => ({
    paddingTop: Math.max(insets.top, 0),
    paddingBottom: Math.max(insets.bottom, 0),
    paddingLeft: Math.max(insets.left, 0),
    paddingRight: Math.max(insets.right, 0),
  });

  const getHeaderPadding = () => ({
    paddingTop: Math.max(insets.top + 10, 20), // Extra 10px padding from safe area
    paddingBottom: 10,
    paddingLeft: Math.max(insets.left + 20, 20),
    paddingRight: Math.max(insets.right + 20, 20),
  });

  return {
    insets,
    statusBarHeight: getStatusBarHeight(),
    safeAreaPadding: getSafeAreaPadding(),
    headerPadding: getHeaderPadding(),
  };
};

export default useSafeAreaHelper;