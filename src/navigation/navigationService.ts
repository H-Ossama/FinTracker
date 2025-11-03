import { createNavigationContainerRef } from '@react-navigation/native';

type RootParamList = {
  [key: string]: object | undefined;
};

type PendingAction = () => void;

export const navigationRef = createNavigationContainerRef<RootParamList>();

const pendingActions: PendingAction[] = [];

const flushPendingActions = () => {
  while (pendingActions.length > 0) {
    const action = pendingActions.shift();
    try {
      action?.();
    } catch (error) {
      console.error('Failed to run pending navigation action:', error);
    }
  }
};

export const onNavigationReady = () => {
  flushPendingActions();
};

export const runAfterNavigationReady = (action: PendingAction) => {
  if (navigationRef.isReady()) {
    action();
  } else {
    pendingActions.push(action);
  }
};

export const navigate = (screen: string, params?: RootParamList[string]) => {
  const action = () => {
    if (!navigationRef.isReady()) {
      pendingActions.push(action);
      return;
    }

    try {
      const navigateFn = navigationRef.navigate as unknown as (
        routeName: string,
        navigateParams?: RootParamList[string]
      ) => void;

      navigateFn(screen, params);
    } catch (error) {
      console.error('Navigation error:', { screen, params, error });
    }
  };

  runAfterNavigationReady(action);
};

export const getCurrentRouteName = (): string | undefined => {
  if (!navigationRef.isReady()) {
    return undefined;
  }

  return navigationRef.getCurrentRoute()?.name;
};
