
export interface PlantType {
  id: string;
  name: string;
  display_name: string;
  growth_stages: number;
  water_per_stage: number;
  emoji: string;
  base_growth_minutes: number;
  rarity: string;
  drop_rate: number;
}

export interface GardenPlot {
  id: string;
  user_id: string;
  plot_number: number;
  unlocked: boolean;
  plant_type: string | null;
  plant_stage: number;
  plant_water_count: number;
  plant_metadata: any;
  last_watered: string | null;
  planted_at: string | null;
  growth_time_minutes: number | null;
  updated_at: string;
}

export interface PlayerGarden {
  id: string;
  user_id: string;
  coins: number;
  gems: number;
  level: number;
  experience: number;
  prestige_points: number;
  active_plot: number;
  total_harvests: number;
  last_played: string;
}

export interface DailyObjective {
  id: string;
  user_id: string;
  objective_type: string;
  target_value: number;
  current_progress: number;
  reward_coins: number;
  reward_gems: number;
  completed: boolean;
  date_assigned: string;
  created_at: string;
}

export interface PlayerAchievement {
  id: string;
  user_id: string;
  achievement_type: string;
  achievement_name: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  reward_coins: number;
  reward_gems: number;
  unlocked_at: string | null;
  created_at: string;
}

export interface ActiveEffect {
  id: string;
  user_id: string;
  effect_type: string;
  effect_value: number;
  expires_at: string | null;
  created_at: string;
}

export interface GameState {
  garden: PlayerGarden | null;
  plots: GardenPlot[];
  plantTypes: PlantType[];
  activeEffects: ActiveEffect[];
  dailyObjectives: DailyObjective[];
  loading: boolean;
}
