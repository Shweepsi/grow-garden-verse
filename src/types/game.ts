
export interface PlantType {
  id: string;
  name: string;
  display_name: string;
  growth_stages: number;
  water_per_stage: number;
  emoji: string;
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
  updated_at: string;
}

export interface PlayerGarden {
  id: string;
  user_id: string;
  coins: number;
  active_plot: number;
  total_harvests: number;
  last_played: string;
}

export interface GameState {
  garden: PlayerGarden | null;
  plots: GardenPlot[];
  plantTypes: PlantType[];
  loading: boolean;
}
