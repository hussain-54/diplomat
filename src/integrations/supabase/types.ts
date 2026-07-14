export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ambassadors: {
        Row: {
          avatar_url: string | null
          country: string
          created_at: string
          featured: boolean
          flag_emoji: string | null
          id: string
          interview_url: string | null
          name: string
          position: string | null
          quote: string | null
          status: Database["public"]["Enums"]["ambassador_status"]
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          country: string
          created_at?: string
          featured?: boolean
          flag_emoji?: string | null
          id?: string
          interview_url?: string | null
          name: string
          position?: string | null
          quote?: string | null
          status?: Database["public"]["Enums"]["ambassador_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          country?: string
          created_at?: string
          featured?: boolean
          flag_emoji?: string | null
          id?: string
          interview_url?: string | null
          name?: string
          position?: string | null
          quote?: string | null
          status?: Database["public"]["Enums"]["ambassador_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      article_tags: {
        Row: {
          article_id: string
          tag_id: string
        }
        Insert: {
          article_id: string
          tag_id: string
        }
        Update: {
          article_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_tags_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          badge_type: Database["public"]["Enums"]["badge_type"]
          body: string | null
          created_at: string
          deck: string | null
          hero_image_url: string | null
          id: string
          published_at: string | null
          region: string | null
          scheduled_at: string | null
          section_id: string | null
          slug: string
          status: Database["public"]["Enums"]["article_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          badge_type?: Database["public"]["Enums"]["badge_type"]
          body?: string | null
          created_at?: string
          deck?: string | null
          hero_image_url?: string | null
          id?: string
          published_at?: string | null
          region?: string | null
          scheduled_at?: string | null
          section_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["article_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          badge_type?: Database["public"]["Enums"]["badge_type"]
          body?: string | null
          created_at?: string
          deck?: string | null
          hero_image_url?: string | null
          id?: string
          published_at?: string | null
          region?: string | null
          scheduled_at?: string | null
          section_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["article_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      editor_section_access: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          section_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          section_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "editor_section_access_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editor_section_access_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      embassies: {
        Row: {
          ambassador_id: string | null
          country: string
          created_at: string
          headline: string | null
          id: string
          status: Database["public"]["Enums"]["embassy_status"]
          updated_at: string
        }
        Insert: {
          ambassador_id?: string | null
          country: string
          created_at?: string
          headline?: string | null
          id?: string
          status?: Database["public"]["Enums"]["embassy_status"]
          updated_at?: string
        }
        Update: {
          ambassador_id?: string | null
          country?: string
          created_at?: string
          headline?: string | null
          id?: string
          status?: Database["public"]["Enums"]["embassy_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "embassies_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id: string
          name?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      sections: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      ticker_items: {
        Row: {
          active: boolean
          created_at: string
          id: string
          sort_order: number
          tag: string | null
          text: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          sort_order?: number
          tag?: string | null
          text: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          sort_order?: number
          tag?: string | null
          text?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          category: string | null
          created_at: string
          duration: string | null
          id: string
          published_at: string | null
          thumbnail_url: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          published_at?: string | null
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      war_monitor_items: {
        Row: {
          conflict_name: string
          countries: string[] | null
          created_at: string
          headline: string | null
          id: string
          status: Database["public"]["Enums"]["war_status"]
          updated_at: string
        }
        Insert: {
          conflict_name: string
          countries?: string[] | null
          created_at?: string
          headline?: string | null
          id?: string
          status?: Database["public"]["Enums"]["war_status"]
          updated_at?: string
        }
        Update: {
          conflict_name?: string
          countries?: string[] | null
          created_at?: string
          headline?: string | null
          id?: string
          status?: Database["public"]["Enums"]["war_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ambassador_status: "active" | "recalled" | "vacant"
      app_role: "super_admin" | "section_editor" | "contributor"
      article_status: "draft" | "review" | "published"
      badge_type:
        | "none"
        | "breaking"
        | "live"
        | "exclusive"
        | "opinion"
        | "premium"
        | "alert"
      embassy_status: "open" | "limited" | "closed" | "alert"
      war_status: "active" | "ceasefire" | "tension"
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
    Enums: {
      ambassador_status: ["active", "recalled", "vacant"],
      app_role: ["super_admin", "section_editor", "contributor"],
      article_status: ["draft", "review", "published"],
      badge_type: [
        "none",
        "breaking",
        "live",
        "exclusive",
        "opinion",
        "premium",
        "alert",
      ],
      embassy_status: ["open", "limited", "closed", "alert"],
      war_status: ["active", "ceasefire", "tension"],
    },
  },
} as const
