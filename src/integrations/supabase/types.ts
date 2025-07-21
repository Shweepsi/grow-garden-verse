export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      active_effects: {
        Row: {
          created_at: string
          effect_type: string
          effect_value: number
          expires_at: string
          id: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          effect_type: string
          effect_value?: number
          expires_at: string
          id?: string
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          effect_type?: string
          effect_value?: number
          expires_at?: string
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_cooldowns: {
        Row: {
          created_at: string
          daily_count: number
          daily_reset_date: string
          fixed_cooldown_duration: number | null
          id: string
          last_ad_watched: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_count?: number
          daily_reset_date?: string
          fixed_cooldown_duration?: number | null
          id?: string
          last_ad_watched?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_count?: number
          daily_reset_date?: string
          fixed_cooldown_duration?: number | null
          id?: string
          last_ad_watched?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_reward_configs: {
        Row: {
          active: boolean | null
          base_amount: number
          created_at: string | null
          description: string
          display_name: string
          duration_minutes: number | null
          emoji: string | null
          id: string
          level_coefficient: number | null
          max_amount: number | null
          min_player_level: number | null
          reward_type: string
        }
        Insert: {
          active?: boolean | null
          base_amount: number
          created_at?: string | null
          description: string
          display_name: string
          duration_minutes?: number | null
          emoji?: string | null
          id?: string
          level_coefficient?: number | null
          max_amount?: number | null
          min_player_level?: number | null
          reward_type: string
        }
        Update: {
          active?: boolean | null
          base_amount?: number
          created_at?: string | null
          description?: string
          display_name?: string
          duration_minutes?: number | null
          emoji?: string | null
          id?: string
          level_coefficient?: number | null
          max_amount?: number | null
          min_player_level?: number | null
          reward_type?: string
        }
        Relationships: []
      }
      ad_sessions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          reward_amount: number
          reward_data: Json | null
          reward_type: string
          user_id: string
          watched_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          reward_amount: number
          reward_data?: Json | null
          reward_type: string
          user_id: string
          watched_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          reward_amount?: number
          reward_data?: Json | null
          reward_type?: string
          user_id?: string
          watched_at?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      garden_plots: {
        Row: {
          created_at: string
          growth_time_seconds: number | null
          id: string
          plant_metadata: Json | null
          plant_type: string | null
          planted_at: string | null
          plot_number: number
          unlocked: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          growth_time_seconds?: number | null
          id?: string
          plant_metadata?: Json | null
          plant_type?: string | null
          planted_at?: string | null
          plot_number: number
          unlocked?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          growth_time_seconds?: number | null
          id?: string
          plant_metadata?: Json | null
          plant_type?: string | null
          planted_at?: string | null
          plot_number?: number
          unlocked?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "garden_plots_plant_type_fkey"
            columns: ["plant_type"]
            isOneToOne: false
            referencedRelation: "plant_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_bots: {
        Row: {
          coins: number
          created_at: string
          experience: number
          id: string
          level: number
          prestige_level: number
          prestige_points: number
          total_harvests: number
          username: string
        }
        Insert: {
          coins?: number
          created_at?: string
          experience?: number
          id?: string
          level?: number
          prestige_level?: number
          prestige_points?: number
          total_harvests?: number
          username: string
        }
        Update: {
          coins?: number
          created_at?: string
          experience?: number
          id?: string
          level?: number
          prestige_level?: number
          prestige_points?: number
          total_harvests?: number
          username?: string
        }
        Relationships: []
      }
      level_upgrades: {
        Row: {
          cost_coins: number
          cost_gems: number
          created_at: string | null
          description: string
          display_name: string
          effect_type: string
          effect_value: number
          emoji: string | null
          id: string
          level_required: number
          name: string
        }
        Insert: {
          cost_coins?: number
          cost_gems?: number
          created_at?: string | null
          description: string
          display_name: string
          effect_type: string
          effect_value?: number
          emoji?: string | null
          id?: string
          level_required: number
          name: string
        }
        Update: {
          cost_coins?: number
          cost_gems?: number
          created_at?: string | null
          description?: string
          display_name?: string
          effect_type?: string
          effect_value?: number
          emoji?: string | null
          id?: string
          level_required?: number
          name?: string
        }
        Relationships: []
      }
      plant_discoveries: {
        Row: {
          discovered_at: string | null
          discovery_method: string | null
          id: string
          plant_type_id: string
          rarity_bonus: number | null
          user_id: string
        }
        Insert: {
          discovered_at?: string | null
          discovery_method?: string | null
          id?: string
          plant_type_id: string
          rarity_bonus?: number | null
          user_id: string
        }
        Update: {
          discovered_at?: string | null
          discovery_method?: string | null
          id?: string
          plant_type_id?: string
          rarity_bonus?: number | null
          user_id?: string
        }
        Relationships: []
      }
      plant_types: {
        Row: {
          base_growth_seconds: number
          created_at: string
          display_name: string
          emoji: string | null
          id: string
          level_required: number | null
          name: string
          rarity: string | null
        }
        Insert: {
          base_growth_seconds?: number
          created_at?: string
          display_name: string
          emoji?: string | null
          id?: string
          level_required?: number | null
          name: string
          rarity?: string | null
        }
        Update: {
          base_growth_seconds?: number
          created_at?: string
          display_name?: string
          emoji?: string | null
          id?: string
          level_required?: number | null
          name?: string
          rarity?: string | null
        }
        Relationships: []
      }
      player_gardens: {
        Row: {
          active_plot: number
          coins: number
          created_at: string
          experience: number | null
          gems: number | null
          id: string
          last_played: string
          level: number | null
          permanent_multiplier: number | null
          prestige_level: number | null
          prestige_points: number | null
          robot_accumulated_coins: number | null
          robot_last_collected: string | null
          robot_level: number
          robot_plant_type: string | null
          total_harvests: number
          user_id: string
        }
        Insert: {
          active_plot?: number
          coins?: number
          created_at?: string
          experience?: number | null
          gems?: number | null
          id?: string
          last_played?: string
          level?: number | null
          permanent_multiplier?: number | null
          prestige_level?: number | null
          prestige_points?: number | null
          robot_accumulated_coins?: number | null
          robot_last_collected?: string | null
          robot_level?: number
          robot_plant_type?: string | null
          total_harvests?: number
          user_id: string
        }
        Update: {
          active_plot?: number
          coins?: number
          created_at?: string
          experience?: number | null
          gems?: number | null
          id?: string
          last_played?: string
          level?: number | null
          permanent_multiplier?: number | null
          prestige_level?: number | null
          prestige_points?: number | null
          robot_accumulated_coins?: number | null
          robot_last_collected?: string | null
          robot_level?: number
          robot_plant_type?: string | null
          total_harvests?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_gardens_robot_plant_type_fkey"
            columns: ["robot_plant_type"]
            isOneToOne: false
            referencedRelation: "plant_types"
            referencedColumns: ["id"]
          },
        ]
      }
      player_upgrades: {
        Row: {
          active: boolean
          id: string
          purchased_at: string | null
          upgrade_id: string
          user_id: string
        }
        Insert: {
          active?: boolean
          id?: string
          purchased_at?: string | null
          upgrade_id: string
          user_id: string
        }
        Update: {
          active?: boolean
          id?: string
          purchased_at?: string | null
          upgrade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_upgrades_upgrade_id_fkey"
            columns: ["upgrade_id"]
            isOneToOne: false
            referencedRelation: "level_upgrades"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          username?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          product_type: string
          reward_data: Json | null
          status: string
          stripe_session_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          product_type?: string
          reward_data?: Json | null
          status?: string
          stripe_session_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          product_type?: string
          reward_data?: Json | null
          status?: string
          stripe_session_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_ad_reward: {
        Args: { reward_type_param: string; player_level_param: number }
        Returns: {
          reward_type: string
          display_name: string
          description: string
          emoji: string
          calculated_amount: number
          duration_minutes: number
        }[]
      }
      cleanup_expired_effects: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_active_effects: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          effect_type: string
          effect_value: number
          expires_at: string
          source: string
        }[]
      }
      get_plot_unlock_cost: {
        Args: { plot_number: number }
        Returns: number
      }
      get_user_coins_rank: {
        Args: { target_user_id: string }
        Returns: number
      }
      get_user_harvest_rank: {
        Args: { target_user_id: string }
        Returns: number
      }
      get_user_level_rank: {
        Args: { target_user_id: string }
        Returns: number
      }
      get_user_prestige_rank: {
        Args: { target_user_id: string }
        Returns: number
      }
      validate_robot_plant_level: {
        Args: { p_robot_level: number; p_plant_type_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
