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
      article_daily_metrics: {
        Row: {
          article_id: string
          metric_date: string
          views: number
        }
        Insert: {
          article_id: string
          metric_date?: string
          views?: number
        }
        Update: {
          article_id?: string
          metric_date?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "article_daily_metrics_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      article_approvals: {
        Row: {
          action: string
          actor_id: string | null
          article_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["article_status"] | null
          id: string
          note: string | null
          to_status: Database["public"]["Enums"]["article_status"] | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          article_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["article_status"] | null
          id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["article_status"] | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          article_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["article_status"] | null
          id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["article_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "article_approvals_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_approvals_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_notes: {
        Row: {
          article_id: string
          author_id: string | null
          body: string
          created_at: string
          id: string
          note_type: string
        }
        Insert: {
          article_id: string
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          note_type: string
        }
        Update: {
          article_id?: string
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          note_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_notes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_revisions: {
        Row: {
          article_id: string
          changed_at: string
          changed_by: string | null
          id: string
          snapshot: Json
          version: number
        }
        Insert: {
          article_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          snapshot: Json
          version: number
        }
        Update: {
          article_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "article_revisions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_revisions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          archive_reason: string | null
          author_id: string | null
          badge_type: Database["public"]["Enums"]["badge_type"]
          body: string | null
          canonical_url: string | null
          cms_extras: Json
          content_score: number
          created_at: string
          deck: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          eeat_score: number
          expiry_at: string | null
          focus_keyword: string | null
          google_discover: boolean
          google_news: boolean
          hero_image_url: string | null
          hreflang: Json
          id: string
          is_featured: boolean
          language: string
          meta_description: string | null
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          priority: string
          published_at: string | null
          region: string | null
          robots_follow: boolean
          robots_index: boolean
          rss_inclusion: boolean
          scheduled_at: string | null
          schema_type: string
          section_id: string | null
          seo_score: number
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["article_status"]
          title: string
          twitter_card: string
          twitter_description: string | null
          twitter_image_url: string | null
          twitter_title: string | null
          updated_at: string
        }
        Insert: {
          archive_reason?: string | null
          author_id?: string | null
          badge_type?: Database["public"]["Enums"]["badge_type"]
          body?: string | null
          canonical_url?: string | null
          cms_extras?: Json
          content_score?: number
          created_at?: string
          deck?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          eeat_score?: number
          expiry_at?: string | null
          focus_keyword?: string | null
          google_discover?: boolean
          google_news?: boolean
          hero_image_url?: string | null
          hreflang?: Json
          id?: string
          is_featured?: boolean
          language?: string
          meta_description?: string | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          priority?: string
          published_at?: string | null
          region?: string | null
          robots_follow?: boolean
          robots_index?: boolean
          rss_inclusion?: boolean
          scheduled_at?: string | null
          schema_type?: string
          section_id?: string | null
          seo_score?: number
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["article_status"]
          title: string
          twitter_card?: string
          twitter_description?: string | null
          twitter_image_url?: string | null
          twitter_title?: string | null
          updated_at?: string
        }
        Update: {
          archive_reason?: string | null
          author_id?: string | null
          badge_type?: Database["public"]["Enums"]["badge_type"]
          body?: string | null
          canonical_url?: string | null
          cms_extras?: Json
          content_score?: number
          created_at?: string
          deck?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          eeat_score?: number
          expiry_at?: string | null
          focus_keyword?: string | null
          google_discover?: boolean
          google_news?: boolean
          hero_image_url?: string | null
          hreflang?: Json
          id?: string
          is_featured?: boolean
          language?: string
          meta_description?: string | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          priority?: string
          published_at?: string | null
          region?: string | null
          robots_follow?: boolean
          robots_index?: boolean
          rss_inclusion?: boolean
          scheduled_at?: string | null
          schema_type?: string
          section_id?: string | null
          seo_score?: number
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["article_status"]
          title?: string
          twitter_card?: string
          twitter_description?: string | null
          twitter_image_url?: string | null
          twitter_title?: string | null
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
      comments: {
        Row: {
          article_id: string
          author_email: string
          author_name: string
          auto_flags: string[]
          body: string
          created_at: string
          id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          status: Database["public"]["Enums"]["comment_status"]
        }
        Insert: {
          article_id: string
          author_email: string
          author_name: string
          auto_flags?: string[]
          body: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          status?: Database["public"]["Enums"]["comment_status"]
        }
        Update: {
          article_id?: string
          author_email?: string
          author_name?: string
          auto_flags?: string[]
          body?: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          status?: Database["public"]["Enums"]["comment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_blocks: {
        Row: {
          blocked_by: string | null
          created_at: string
          email: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          email: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          email?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_blocks_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      media_assets: {
        Row: {
          alt_text: string | null
          asset_type: string
          bucket: string
          caption: string | null
          copyright: string | null
          created_at: string
          duration_seconds: number | null
          file_name: string
          folder_id: string | null
          height: number | null
          id: string
          mime_type: string
          object_path: string
          public_url: string
          size_bytes: number
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          asset_type?: string
          bucket: string
          caption?: string | null
          copyright?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_name: string
          folder_id?: string | null
          height?: number | null
          id?: string
          mime_type: string
          object_path: string
          public_url: string
          size_bytes: number
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          asset_type?: string
          bucket?: string
          caption?: string | null
          copyright?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_name?: string
          folder_id?: string | null
          height?: number | null
          id?: string
          mime_type?: string
          object_path?: string
          public_url?: string
          size_bytes?: number
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_asset_usages: {
        Row: {
          asset_id: string
          created_at: string
          entity_id: string
          entity_path: string | null
          entity_title: string | null
          entity_type: string
          field: string
          id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          entity_id: string
          entity_path?: string | null
          entity_title?: string | null
          entity_type: string
          field: string
          id?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          entity_id?: string
          entity_path?: string | null
          entity_title?: string | null
          entity_type?: string
          field?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_asset_usages_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_folders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_settings: {
        Row: {
          comments_enabled: boolean
          contact_email: string | null
          default_article_status: Database["public"]["Enums"]["article_status"]
          id: boolean
          integrations: Json
          notification_prefs: Json
          publication_name: string
          seo_defaults: Json
          short_name: string
          tagline: string
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          comments_enabled?: boolean
          contact_email?: string | null
          default_article_status?: Database["public"]["Enums"]["article_status"]
          id?: boolean
          integrations?: Json
          notification_prefs?: Json
          publication_name?: string
          seo_defaults?: Json
          short_name?: string
          tagline?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          comments_enabled?: boolean
          contact_email?: string | null
          default_article_status?: Database["public"]["Enums"]["article_status"]
          id?: boolean
          integrations?: Json
          notification_prefs?: Json
          publication_name?: string
          seo_defaults?: Json
          short_name?: string
          tagline?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          payload: Json
          summary: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          payload?: Json
          summary?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          payload?: Json
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_ip_whitelist: {
        Row: {
          cidr: string
          created_at: string
          created_by: string | null
          id: string
          label: string | null
        }
        Insert: {
          cidr: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
        }
        Update: {
          cidr?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_ip_whitelist_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_backup_records: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string
          notes: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          notes?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_backup_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          event_type: string
          id: string
          payload: Json
          recipient_email: string | null
          recipient_user_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
        }
        Insert: {
          channel?: string
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          payload?: Json
          recipient_email?: string | null
          recipient_user_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          recipient_email?: string | null
          recipient_user_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_score: number
          avatar_url: string | null
          bio: string | null
          byline_name: string | null
          created_at: string
          department_id: string | null
          designation: string | null
          email: string | null
          id: string
          last_login_at: string | null
          location: string | null
          name: string | null
          phone: string | null
          social_links: Json
          status: string
          team_id: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          activity_score?: number
          avatar_url?: string | null
          bio?: string | null
          byline_name?: string | null
          created_at?: string
          department_id?: string | null
          designation?: string | null
          email?: string | null
          id: string
          last_login_at?: string | null
          location?: string | null
          name?: string | null
          phone?: string | null
          social_links?: Json
          status?: string
          team_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          activity_score?: number
          avatar_url?: string | null
          bio?: string | null
          byline_name?: string | null
          created_at?: string
          department_id?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          last_login_at?: string | null
          location?: string | null
          name?: string | null
          phone?: string | null
          social_links?: Json
          status?: string
          team_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          department_id: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          department_id: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          department_id?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          byline_name: string | null
          created_at: string
          department_id: string | null
          designation: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          name: string | null
          roles: string[]
          status: string
          team_id: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          byline_name?: string | null
          created_at?: string
          department_id?: string | null
          designation?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          name?: string | null
          roles?: string[]
          status?: string
          team_id?: string | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          byline_name?: string | null
          created_at?: string
          department_id?: string | null
          designation?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          name?: string | null
          roles?: string[]
          status?: string
          team_id?: string | null
          token?: string
        }
        Relationships: []
      }
      staff_activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: string | null
          id: string
          payload: Json
          subject_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          payload?: Json
          subject_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          payload?: Json
          subject_id?: string | null
        }
        Relationships: []
      }
      sections: {
        Row: {
          access_mode: string | null
          ai_score: number | null
          ai_summary: string | null
          breaking_news: boolean
          canonical_url: string | null
          category_type: string | null
          color: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          default_author_id: string | null
          description: string | null
          discover_eligible: boolean
          entities: Json | null
          featured: boolean
          focus_keywords: string[] | null
          icon_url: string | null
          id: string
          language: string | null
          meta_description: string | null
          name: string
          news_eligible: boolean
          news_priority: number | null
          news_sitemap: boolean
          og_description: string | null
          og_title: string | null
          parent_id: string | null
          region: string | null
          schema_type: string | null
          search_intent: string | null
          semantic_keywords: string[] | null
          seo_score: number | null
          seo_title: string | null
          short_description: string | null
          slug: string
          sort_order: number
          topic_cluster: string | null
          twitter_description: string | null
          twitter_title: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          access_mode?: string | null
          ai_score?: number | null
          ai_summary?: string | null
          breaking_news?: boolean
          canonical_url?: string | null
          category_type?: string | null
          color?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          default_author_id?: string | null
          description?: string | null
          discover_eligible?: boolean
          entities?: Json | null
          featured?: boolean
          focus_keywords?: string[] | null
          icon_url?: string | null
          id?: string
          language?: string | null
          meta_description?: string | null
          name: string
          news_eligible?: boolean
          news_priority?: number | null
          news_sitemap?: boolean
          og_description?: string | null
          og_title?: string | null
          parent_id?: string | null
          region?: string | null
          schema_type?: string | null
          search_intent?: string | null
          semantic_keywords?: string[] | null
          seo_score?: number | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number
          topic_cluster?: string | null
          twitter_description?: string | null
          twitter_title?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          access_mode?: string | null
          ai_score?: number | null
          ai_summary?: string | null
          breaking_news?: boolean
          canonical_url?: string | null
          category_type?: string | null
          color?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          default_author_id?: string | null
          description?: string | null
          discover_eligible?: boolean
          entities?: Json | null
          featured?: boolean
          focus_keywords?: string[] | null
          icon_url?: string | null
          id?: string
          language?: string | null
          meta_description?: string | null
          name?: string
          news_eligible?: boolean
          news_priority?: number | null
          news_sitemap?: boolean
          og_description?: string | null
          og_title?: string | null
          parent_id?: string | null
          region?: string | null
          schema_type?: string | null
          search_intent?: string | null
          semantic_keywords?: string[] | null
          seo_score?: number | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          topic_cluster?: string | null
          twitter_description?: string | null
          twitter_title?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_default_author_id_fkey"
            columns: ["default_author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      category_activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: string | null
          id: string
          ip: string | null
          payload: Json
          section_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          ip?: string | null
          payload?: Json
          section_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          ip?: string | null
          payload?: Json
          section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_activity_logs_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      category_module_settings: {
        Row: {
          advanced: Json
          general: Json
          id: boolean
          notifications: Json
          permissions: Json
          seo_defaults: Json
          social: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          advanced?: Json
          general?: Json
          id?: boolean
          notifications?: Json
          permissions?: Json
          seo_defaults?: Json
          social?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          advanced?: Json
          general?: Json
          id?: boolean
          notifications?: Json
          permissions?: Json
          seo_defaults?: Json
          social?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_module_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          ai_optimized: boolean
          country: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discover_eligible: boolean
          focus_keyword: string | null
          icon_name: string | null
          icon_url: string | null
          id: string
          language: string
          meta_description: string | null
          name: string
          parent_id: string | null
          scheduled_at: string | null
          seo_score: number
          seo_title: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_optimized?: boolean
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discover_eligible?: boolean
          focus_keyword?: string | null
          icon_name?: string | null
          icon_url?: string | null
          id?: string
          language?: string
          meta_description?: string | null
          name: string
          parent_id?: string | null
          scheduled_at?: string | null
          seo_score?: number
          seo_title?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_optimized?: boolean
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discover_eligible?: boolean
          focus_keyword?: string | null
          icon_name?: string | null
          icon_url?: string | null
          id?: string
          language?: string
          meta_description?: string | null
          name?: string
          parent_id?: string | null
          scheduled_at?: string | null
          seo_score?: number
          seo_title?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: string | null
          id: string
          payload: Json
          tag_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          payload?: Json
          tag_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          payload?: Json
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tag_activity_logs_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      admin_update_article_seo: {
        Args: {
          p_article_id: string
          p_seo_title?: string | null
          p_meta_description?: string | null
          p_focus_keyword?: string | null
          p_canonical_url?: string | null
          p_robots_index?: boolean
          p_robots_follow?: boolean
          p_schema_type?: string
          p_og_title?: string | null
          p_og_description?: string | null
          p_og_image_url?: string | null
          p_twitter_card?: string
          p_twitter_title?: string | null
          p_twitter_description?: string | null
          p_twitter_image_url?: string | null
          p_rss_inclusion?: boolean
          p_hreflang?: Json
        }
        Returns: Database["public"]["Tables"]["articles"]["Row"]
      }
      admin_upsert_article: {
        Args: {
          p_title: string
          p_section_id: string
          p_status?: Database["public"]["Enums"]["article_status"]
          p_id?: string | null
          p_deck?: string | null
          p_body?: string | null
          p_region?: string | null
          p_badge_type?: Database["public"]["Enums"]["badge_type"]
          p_hero_image_url?: string | null
          p_slug?: string | null
          p_scheduled_at?: string | null
        }
        Returns: Database["public"]["Tables"]["articles"]["Row"]
      }
      admin_bulk_manage_articles: {
        Args: {
          p_action: string
          p_ids: string[]
          p_section_id?: string | null
        }
        Returns: number
      }
      admin_restore_article_revision: {
        Args: {
          p_revision_id: string
        }
        Returns: string
      }
      publish_due_articles: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      enqueue_notification: {
        Args: {
          p_event_type: string
          p_payload?: Json
          p_recipient_user_id?: string | null
          p_recipient_email?: string | null
          p_channel?: string
        }
        Returns: string
      }
      admin_reorder_categories: {
        Args: {
          p_items: Json
        }
        Returns: number
      }
      admin_list_staff: {
        Args: Record<string, never>
        Returns: Json
      }
      increment_article_view: {
        Args: {
          p_article_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      ambassador_status: "active" | "recalled" | "vacant"
      app_role:
        | "super_admin"
        | "editor_in_chief"
        | "managing_editor"
        | "section_editor"
        | "reporter"
        | "contributor"
        | "photographer"
        | "videographer"
        | "fact_checker"
        | "translator"
      article_status: "draft" | "review" | "approved" | "scheduled" | "published" | "archived"
      badge_type:
        | "none"
        | "breaking"
        | "live"
        | "exclusive"
        | "opinion"
        | "premium"
        | "alert"
      comment_status: "pending" | "approved" | "rejected" | "spam" | "flagged"
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
      app_role: [
        "super_admin",
        "editor_in_chief",
        "managing_editor",
        "section_editor",
        "reporter",
        "contributor",
        "photographer",
        "videographer",
        "fact_checker",
        "translator",
      ],
      article_status: ["draft", "review", "approved", "scheduled", "published", "archived"],
      badge_type: [
        "none",
        "breaking",
        "live",
        "exclusive",
        "opinion",
        "premium",
        "alert",
      ],
      comment_status: ["pending", "approved", "rejected", "spam", "flagged"],
      embassy_status: ["open", "limited", "closed", "alert"],
      war_status: ["active", "ceasefire", "tension"],
    },
  },
} as const
