export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      active_effects: {
        Row: {
          created_at: string
          effect_type: string
          effect_value: number
          expires_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          effect_type: string
          effect_value?: number
          expires_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          effect_type?: string
          effect_value?: number
          expires_at?: string | null
          id?: string
          user_id?: string
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
          total_harvests?: number
          user_id?: string
        }
        Relationships: []
      }
      player_upgrades: {
        Row: {
          id: string
          purchased_at: string | null
          upgrade_id: string
          user_id: string
        }
        Insert: {
          id?: string
          purchased_at?: string | null
          upgrade_id: string
          user_id: string
        }
        Update: {
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
      shop_items: {
        Row: {
          created_at: string
          description: string
          display_name: string
          effects: Json | null
          emoji: string | null
          id: string
          item_type: string
          name: string
          price_coins: number
          price_gems: number
        }
        Insert: {
          created_at?: string
          description: string
          display_name: string
          effects?: Json | null
          emoji?: string | null
          id?: string
          item_type: string
          name: string
          price_coins?: number
          price_gems?: number
        }
        Update: {
          created_at?: string
          description?: string
          display_name?: string
          effects?: Json | null
          emoji?: string | null
          id?: string
          item_type?: string
          name?: string
          price_coins?: number
          price_gems?: number
        }
        Relationships: []
      }
      tool_uses: {
        Row: {
          effect_applied: Json | null
          id: string
          plot_number: number
          shop_item_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          effect_applied?: Json | null
          id?: string
          plot_number: number
          shop_item_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          effect_applied?: Json | null
          id?: string
          plot_number?: number
          shop_item_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_uses_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_effects: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_plot_unlock_cost: {
        Args: { plot_number: number }
        Returns: number
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
