export const SUBSCRIPTION_STORAGE_KEYS = {
  legacy: {
    PRO_STATUS: 'pro_subscription_status',
    DEV_OVERRIDE: 'dev_pro_override',
    BILLING_PERIOD: 'subscription_billing_period',
    OWNER_USER_ID: 'subscription_owner_user_id',
  },

  proStatus: (userId: string) => `subscription:${userId}:pro_status`,
  devOverride: (userId: string) => `subscription:${userId}:dev_override`,
  billingPeriod: (userId: string) => `subscription:${userId}:billing_period`,
};

export const normalizeUserKey = (userIdOrEmail?: string | null): string | null => {
  const value = (userIdOrEmail ?? '').trim();
  return value.length > 0 ? value : null;
};
