export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';

export interface ProfileRow {
  id: string;
  full_name: string | null;
  sex: 'male' | 'female' | 'other' | null;
  birth_year: number | null;
  experience_years: number;
  current_weekly_km: number;
  days_per_week: number;
  has_done_intervals: boolean;
  goal: 'progress' | 'perform';
  vdot: number;
  track_cycle: boolean;
  time_constraints_min: number | null;
  locale: 'fr' | 'en';
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  trial_end: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}
