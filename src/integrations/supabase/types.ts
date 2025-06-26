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
          id: string
          last_watered: string | null
          plant_metadata: Json | null
          plant_stage: number
          plant_type: string | null
          plant_water_count: number
          plot_number: number
          unlocked: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_watered?: string | null
          plant_metadata?: Json | null
          plant_stage?: number
          plant_type?: string | null
          plant_water_count?: number
          plot_number: number
          unlocked?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_watered?: string | null
          plant_metadata?: Json | null
          plant_stage?: number
          plant_type?: string | null
          plant_water_count?: number
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
      plant_types: {
        Row: {
          created_at: string
          display_name: string
          emoji: string | null
          growth_stages: number
          id: string
          name: string
          water_per_stage: number
        }
        Insert: {
          created_at?: string
          display_name: string
          emoji?: string | null
          growth_stages?: number
          id?: string
          name: string
          water_per_stage?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          emoji?: string | null
          growth_stages?: number
          id?: string
          name?: string
          water_per_stage?: number
        }
        Relationships: []
      }
      player_gardens: {
        Row: {
          active_plot: number
          coins: number
          created_at: string
          id: string
          last_played: string
          total_harvests: number
          user_id: string
        }
        Insert: {
          active_plot?: number
          coins?: number
          created_at?: string
          id?: string
          last_played?: string
          total_harvests?: number
          user_id: string
        }
        Update: {
          active_plot?: number
          coins?: number
          created_at?: string
          id?: string
          last_played?: string
          total_harvests?: number
          user_id?: string
        }
        Relationships: []
      }
      player_inventory: {
        Row: {
          created_at: string
          id: string
          item_name: string
          item_type: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          item_type: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          item_type?: string
          quantity?: number
          user_id?: string
        }
        Relationships: []
      }
      player_inventory_items: {
        Row: {
          id: string
          purchased_at: string
          quantity: number
          shop_item_id: string
          user_id: string
        }
        Insert: {
          id?: string
          purchased_at?: string
          quantity?: number
          shop_item_id: string
          user_id: string
        }
        Update: {
          id?: string
          purchased_at?: string
          quantity?: number
          shop_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_inventory_items_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
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
      purchase_history: {
        Row: {
          id: string
          purchased_at: string
          quantity: number
          shop_item_id: string
          total_cost: number
          user_id: string
        }
        Insert: {
          id?: string
          purchased_at?: string
          quantity: number
          shop_item_id: string
          total_cost: number
          user_id: string
        }
        Update: {
          id?: string
          purchased_at?: string
          quantity?: number
          shop_item_id?: string
          total_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_history_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          available: boolean
          created_at: string
          description: string | null
          display_name: string
          effects: Json | null
          emoji: string | null
          id: string
          is_premium: boolean
          item_type: string
          name: string
          price: number
          rarity: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          description?: string | null
          display_name: string
          effects?: Json | null
          emoji?: string | null
          id?: string
          is_premium?: boolean
          item_type: string
          name: string
          price: number
          rarity?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          description?: string | null
          display_name?: string
          effects?: Json | null
          emoji?: string | null
          id?: string
          is_premium?: boolean
          item_type?: string
          name?: string
          price?: number
          rarity?: string
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
