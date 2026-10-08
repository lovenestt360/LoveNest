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
      admin_announcements: {
        Row: {
          active: boolean | null
          content: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          active?: boolean | null
          content: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          active?: boolean | null
          content?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          role: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      albums: {
        Row: {
          couple_space_id: string
          created_at: string
          created_by: string
          id: string
          title: string
        }
        Insert: {
          couple_space_id: string
          created_at?: string
          created_by: string
          id?: string
          title: string
        }
        Update: {
          couple_space_id?: string
          created_at?: string
          created_by?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "albums_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      book_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      book_chapters: {
        Row: {
          book_id: string
          content: string
          created_at: string
          id: string
          order_index: number
          status: string
          title: string
          updated_at: string
          word_count: number
        }
        Insert: {
          book_id: string
          content?: string
          created_at?: string
          id?: string
          order_index?: number
          status?: string
          title: string
          updated_at?: string
          word_count?: number
        }
        Update: {
          book_id?: string
          content?: string
          created_at?: string
          id?: string
          order_index?: number
          status?: string
          title?: string
          updated_at?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_favorites: {
        Row: {
          book_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_favorites_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_purchases: {
        Row: {
          admin_notes: string | null
          amount: string | null
          book_id: string
          couple_space_id: string
          created_at: string
          external_id: string | null
          id: string
          method: string | null
          proof_url: string | null
          provider: string
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount?: string | null
          book_id: string
          couple_space_id: string
          created_at?: string
          external_id?: string | null
          id?: string
          method?: string | null
          proof_url?: string | null
          provider?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: string | null
          book_id?: string
          couple_space_id?: string
          created_at?: string
          external_id?: string | null
          id?: string
          method?: string | null
          proof_url?: string | null
          provider?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_purchases_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_purchases_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      book_ratings: {
        Row: {
          book_id: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_ratings_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_reading_progress: {
        Row: {
          book_id: string
          completed_at: string | null
          couple_space_id: string
          created_at: string
          id: string
          location: string | null
          progress_percent: number
          total_minutes_read: number
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          completed_at?: string | null
          couple_space_id: string
          created_at?: string
          id?: string
          location?: string | null
          progress_percent?: number
          total_minutes_read?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          completed_at?: string | null
          couple_space_id?: string
          created_at?: string
          id?: string
          location?: string | null
          progress_percent?: number
          total_minutes_read?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_reading_progress_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      book_reflections: {
        Row: {
          book_id: string
          chapter_id: string
          content: string
          couple_space_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          chapter_id: string
          content: string
          couple_space_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          chapter_id?: string
          content?: string
          couple_space_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_reflections_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_reflections_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string | null
          category_id: string | null
          chapter_count: number | null
          cover_url: string | null
          created_at: string
          currency: string
          description: string | null
          estimated_minutes: number | null
          file_path: string | null
          file_type: string | null
          id: string
          is_featured: boolean
          is_free: boolean
          is_recommended: boolean
          page_count: number | null
          price: number | null
          sort_order: number
          status: string
          tags: string[]
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          author?: string | null
          category_id?: string | null
          chapter_count?: number | null
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          estimated_minutes?: number | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          is_featured?: boolean
          is_free?: boolean
          is_recommended?: boolean
          page_count?: number | null
          price?: number | null
          sort_order?: number
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          author?: string | null
          category_id?: string | null
          chapter_count?: number | null
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          estimated_minutes?: number | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          is_featured?: boolean
          is_free?: boolean
          is_recommended?: boolean
          page_count?: number | null
          price?: number | null
          sort_order?: number
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "books_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "book_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ceremonies_log: {
        Row: {
          ceremony_key: string
          ceremony_type: string
          couple_space_id: string
          id: string
          shown_at: string
        }
        Insert: {
          ceremony_key: string
          ceremony_type: string
          couple_space_id: string
          id?: string
          shown_at?: string
        }
        Update: {
          ceremony_key?: string
          ceremony_type?: string
          couple_space_id?: string
          id?: string
          shown_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ceremonies_log_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_messages: {
        Row: {
          complaint_id: string
          content: string
          couple_space_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          complaint_id: string
          content: string
          couple_space_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          complaint_id?: string
          content?: string
          couple_space_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_messages_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_messages_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          clear_request: string | null
          couple_space_id: string
          created_at: string
          created_by: string
          description: string
          feeling: string | null
          id: string
          resolved_at: string | null
          severity: number
          solution_note: string | null
          status: string
          title: string
        }
        Insert: {
          clear_request?: string | null
          couple_space_id: string
          created_at?: string
          created_by: string
          description: string
          feeling?: string | null
          id?: string
          resolved_at?: string | null
          severity?: number
          solution_note?: string | null
          status?: string
          title: string
        }
        Update: {
          clear_request?: string | null
          couple_space_id?: string
          created_at?: string
          created_by?: string
          description?: string
          feeling?: string | null
          id?: string
          resolved_at?: string | null
          severity?: number
          solution_note?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_challenges: {
        Row: {
          completed_at: string | null
          couple_space_id: string
          created_at: string | null
          description: string | null
          id: string
          is_completed: boolean | null
          title: string
        }
        Insert: {
          completed_at?: string | null
          couple_space_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          title: string
        }
        Update: {
          completed_at?: string | null
          couple_space_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_challenges_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_daily_missions: {
        Row: {
          assignment_date: string
          couple_space_id: string
          id: string
          mission_id: string
        }
        Insert: {
          assignment_date?: string
          couple_space_id: string
          id?: string
          mission_id: string
        }
        Update: {
          assignment_date?: string
          couple_space_id?: string
          id?: string
          mission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_daily_missions_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couple_daily_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "love_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_mission_rewards: {
        Row: {
          couple_space_id: string
          created_at: string | null
          id: string
          mission_id: string
          points_awarded: number
          reward_date: string
        }
        Insert: {
          couple_space_id: string
          created_at?: string | null
          id?: string
          mission_id: string
          points_awarded?: number
          reward_date?: string
        }
        Update: {
          couple_space_id?: string
          created_at?: string | null
          id?: string
          mission_id?: string
          points_awarded?: number
          reward_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_mission_rewards_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couple_mission_rewards_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "love_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_missions: {
        Row: {
          completed: boolean
          couple_id: string | null
          created_at: string | null
          day: string
          id: string
          mission_id: string | null
          progress: number
        }
        Insert: {
          completed?: boolean
          couple_id?: string | null
          created_at?: string | null
          day: string
          id?: string
          mission_id?: string | null
          progress?: number
        }
        Update: {
          completed?: boolean
          couple_id?: string | null
          created_at?: string | null
          day?: string
          id?: string
          mission_id?: string | null
          progress?: number
        }
        Relationships: [
          {
            foreignKeyName: "couple_missions_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couple_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "love_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_spaces: {
        Row: {
          chat_wallpaper_opacity: number | null
          chat_wallpaper_url: string | null
          created_at: string
          house_image: string | null
          house_name: string | null
          id: string
          initials: string | null
          invite_code: string
          is_suspended: boolean | null
          is_verified: boolean | null
          last_perfect_day_date: string | null
          last_streak_date: string | null
          longest_streak: number | null
          partner1_name: string | null
          partner2_name: string | null
          perfect_days_count: number
          plan_id: string | null
          relationship_start_date: string | null
          status: string | null
          streak_count: number | null
          subscription_status: string | null
          tier_level: number
          timezone: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          trial_used: boolean | null
          updated_at: string
        }
        Insert: {
          chat_wallpaper_opacity?: number | null
          chat_wallpaper_url?: string | null
          created_at?: string
          house_image?: string | null
          house_name?: string | null
          id?: string
          initials?: string | null
          invite_code: string
          is_suspended?: boolean | null
          is_verified?: boolean | null
          last_perfect_day_date?: string | null
          last_streak_date?: string | null
          longest_streak?: number | null
          partner1_name?: string | null
          partner2_name?: string | null
          perfect_days_count?: number
          plan_id?: string | null
          relationship_start_date?: string | null
          status?: string | null
          streak_count?: number | null
          subscription_status?: string | null
          tier_level?: number
          timezone?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          trial_used?: boolean | null
          updated_at?: string
        }
        Update: {
          chat_wallpaper_opacity?: number | null
          chat_wallpaper_url?: string | null
          created_at?: string
          house_image?: string | null
          house_name?: string | null
          id?: string
          initials?: string | null
          invite_code?: string
          is_suspended?: boolean | null
          is_verified?: boolean | null
          last_perfect_day_date?: string | null
          last_streak_date?: string | null
          longest_streak?: number | null
          partner1_name?: string | null
          partner2_name?: string | null
          perfect_days_count?: number
          plan_id?: string | null
          relationship_start_date?: string | null
          status?: string | null
          streak_count?: number | null
          subscription_status?: string | null
          tier_level?: number
          timezone?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          trial_used?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      couples: {
        Row: {
          created_at: string | null
          id: string
          user_1: string | null
          user_2: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_1?: string | null
          user_2?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          user_1?: string | null
          user_2?: string | null
        }
        Relationships: []
      }
      cycle_profiles: {
        Row: {
          avg_cycle_length: number
          avg_period_length: number
          couple_space_id: string
          created_at: string
          id: string
          luteal_length: number
          pms_days: number
          share_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_cycle_length?: number
          avg_period_length?: number
          couple_space_id: string
          created_at?: string
          id?: string
          luteal_length?: number
          pms_days?: number
          share_level?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_cycle_length?: number
          avg_period_length?: number
          couple_space_id?: string
          created_at?: string
          id?: string
          luteal_length?: number
          pms_days?: number
          share_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_profiles_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activity: {
        Row: {
          activity_date: string
          couple_id: string | null
          couple_space_id: string | null
          created_at: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          activity_date?: string
          couple_id?: string | null
          couple_space_id?: string | null
          created_at?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          activity_date?: string
          couple_id?: string | null
          couple_space_id?: string | null
          created_at?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_interactions: {
        Row: {
          couple_space_id: string
          created_at: string
          day_key: string
          id: string
          interaction_type: string
          user_id: string
        }
        Insert: {
          couple_space_id: string
          created_at?: string
          day_key?: string
          id?: string
          interaction_type: string
          user_id: string
        }
        Update: {
          couple_space_id?: string
          created_at?: string
          day_key?: string
          id?: string
          interaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_interactions_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_prayers: {
        Row: {
          couple_space_id: string
          created_at: string
          created_by: string
          day_key: string
          id: string
          prayer_text: string
          verse_ref: string | null
        }
        Insert: {
          couple_space_id: string
          created_at?: string
          created_by: string
          day_key?: string
          id?: string
          prayer_text: string
          verse_ref?: string | null
        }
        Update: {
          couple_space_id?: string
          created_at?: string
          created_by?: string
          day_key?: string
          id?: string
          prayer_text?: string
          verse_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_prayers_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_spiritual_logs: {
        Row: {
          couple_space_id: string
          cried_today: boolean
          day_key: string
          gratitude_note: string | null
          id: string
          prayed_today: boolean
          reflection_note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          couple_space_id: string
          cried_today?: boolean
          day_key?: string
          gratitude_note?: string | null
          id?: string
          prayed_today?: boolean
          reflection_note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          couple_space_id?: string
          cried_today?: boolean
          day_key?: string
          gratitude_note?: string | null
          id?: string
          prayed_today?: boolean
          reflection_note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_spiritual_logs_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_symptoms: {
        Row: {
          acne: boolean
          anxiety: boolean
          back_pain: boolean
          bloating: boolean
          breast_tenderness: boolean
          constipation: boolean
          couple_space_id: string
          cramps: boolean
          cravings: boolean
          created_at: string
          crying: boolean
          day_key: string
          diarrhea: boolean
          discharge: string
          discharge_type: string
          dizziness: boolean
          energy_level: number
          fatigue: boolean
          gas: boolean
          headache: boolean
          id: string
          increased_appetite: boolean
          irritability: boolean
          leg_pain: boolean
          libido: number
          mood_swings: boolean
          nausea: boolean
          notes: string | null
          pain_level: number
          sadness: boolean
          sensitivity: boolean
          sleep_hours: number | null
          sleep_quality: string
          stress: number
          temperature_c: number | null
          tpm: boolean
          updated_at: string
          user_id: string
          weakness: boolean
        }
        Insert: {
          acne?: boolean
          anxiety?: boolean
          back_pain?: boolean
          bloating?: boolean
          breast_tenderness?: boolean
          constipation?: boolean
          couple_space_id: string
          cramps?: boolean
          cravings?: boolean
          created_at?: string
          crying?: boolean
          day_key?: string
          diarrhea?: boolean
          discharge?: string
          discharge_type?: string
          dizziness?: boolean
          energy_level?: number
          fatigue?: boolean
          gas?: boolean
          headache?: boolean
          id?: string
          increased_appetite?: boolean
          irritability?: boolean
          leg_pain?: boolean
          libido?: number
          mood_swings?: boolean
          nausea?: boolean
          notes?: string | null
          pain_level?: number
          sadness?: boolean
          sensitivity?: boolean
          sleep_hours?: number | null
          sleep_quality?: string
          stress?: number
          temperature_c?: number | null
          tpm?: boolean
          updated_at?: string
          user_id: string
          weakness?: boolean
        }
        Update: {
          acne?: boolean
          anxiety?: boolean
          back_pain?: boolean
          bloating?: boolean
          breast_tenderness?: boolean
          constipation?: boolean
          couple_space_id?: string
          cramps?: boolean
          cravings?: boolean
          created_at?: string
          crying?: boolean
          day_key?: string
          diarrhea?: boolean
          discharge?: string
          discharge_type?: string
          dizziness?: boolean
          energy_level?: number
          fatigue?: boolean
          gas?: boolean
          headache?: boolean
          id?: string
          increased_appetite?: boolean
          irritability?: boolean
          leg_pain?: boolean
          libido?: number
          mood_swings?: boolean
          nausea?: boolean
          notes?: string | null
          pain_level?: number
          sadness?: boolean
          sensitivity?: boolean
          sleep_hours?: number | null
          sleep_quality?: string
          stress?: number
          temperature_c?: number | null
          tpm?: boolean
          updated_at?: string
          user_id?: string
          weakness?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "daily_symptoms_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_function_logs: {
        Row: {
          created_at: string | null
          event_type: string
          function_name: string
          id: string
          payload: Json | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          function_name: string
          id?: string
          payload?: Json | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          function_name?: string
          id?: string
          payload?: Json | null
        }
        Relationships: []
      }
      events: {
        Row: {
          couple_space_id: string
          created_at: string
          created_by: string
          end_time: string | null
          event_date: string
          id: string
          location: string | null
          notes: string | null
          start_time: string | null
          title: string
        }
        Insert: {
          couple_space_id: string
          created_at?: string
          created_by: string
          end_time?: string | null
          event_date: string
          id?: string
          location?: string | null
          notes?: string | null
          start_time?: string | null
          title: string
        }
        Update: {
          couple_space_id?: string
          created_at?: string
          created_by?: string
          end_time?: string | null
          event_date?: string
          id?: string
          location?: string | null
          notes?: string | null
          start_time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fasting_abstentions: {
        Row: {
          category: string
          created_at: string
          id: string
          notes: string | null
          priority: string
          profile_id: string
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          priority?: string
          profile_id: string
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          priority?: string
          profile_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fasting_abstentions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "fasting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fasting_checklist_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          label: string
          profile_id: string
          section: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          label: string
          profile_id: string
          section: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          label?: string
          profile_id?: string
          section?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fasting_checklist_templates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "fasting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fasting_couple_messages: {
        Row: {
          couple_space_id: string
          created_at: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          couple_space_id: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          couple_space_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fasting_couple_messages_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fasting_day_item_logs: {
        Row: {
          created_at: string
          day_log_id: string
          id: string
          label: string
          reason: string | null
          status: string
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_log_id: string
          id?: string
          label: string
          reason?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_log_id?: string
          id?: string
          label?: string
          reason?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fasting_day_item_logs_day_log_id_fkey"
            columns: ["day_log_id"]
            isOneToOne: false
            referencedRelation: "fasting_day_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fasting_day_item_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "fasting_checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      fasting_day_logs: {
        Row: {
          created_at: string
          day_key: string
          day_number: number | null
          finalized: boolean
          id: string
          mood: string | null
          note: string | null
          profile_id: string
          result: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_key: string
          day_number?: number | null
          finalized?: boolean
          id?: string
          mood?: string | null
          note?: string | null
          profile_id: string
          result?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_key?: string
          day_number?: number | null
          finalized?: boolean
          id?: string
          mood?: string | null
          note?: string | null
          profile_id?: string
          result?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fasting_day_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "fasting_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fasting_partner_shares: {
        Row: {
          couple_space_id: string | null
          id: string
          share_level: string
          support_message: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          couple_space_id?: string | null
          id?: string
          share_level?: string
          support_message?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          couple_space_id?: string | null
          id?: string
          share_level?: string
          support_message?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fasting_partner_shares_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fasting_profiles: {
        Row: {
          couple_space_id: string | null
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          plan_name: string
          plan_type: string
          rules_allowed: string | null
          rules_exceptions: string | null
          rules_forbidden: string | null
          start_date: string
          total_days: number
          until_hour: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          couple_space_id?: string | null
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          plan_name?: string
          plan_type?: string
          rules_allowed?: string | null
          rules_exceptions?: string | null
          rules_forbidden?: string | null
          start_date: string
          total_days?: number
          until_hour?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          couple_space_id?: string | null
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          plan_name?: string
          plan_type?: string
          rules_allowed?: string | null
          rules_exceptions?: string | null
          rules_forbidden?: string | null
          start_date?: string
          total_days?: number
          until_hour?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fasting_profiles_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fasting_reminders: {
        Row: {
          alerta_calendario: boolean | null
          hora_terminar: boolean | null
          id: string
          motivacao_dia: boolean | null
          oracao: boolean | null
          reflexao_noturna: boolean | null
          registar_dia: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alerta_calendario?: boolean | null
          hora_terminar?: boolean | null
          id?: string
          motivacao_dia?: boolean | null
          oracao?: boolean | null
          reflexao_noturna?: boolean | null
          registar_dia?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alerta_calendario?: boolean | null
          hora_terminar?: boolean | null
          id?: string
          motivacao_dia?: boolean | null
          oracao?: boolean | null
          reflexao_noturna?: boolean | null
          registar_dia?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorite_places: {
        Row: {
          couple_space_id: string
          created_at: string
          created_by: string
          icon: string
          id: string
          lat: number
          lng: number
          name: string
          radius_m: number
        }
        Insert: {
          couple_space_id: string
          created_at?: string
          created_by: string
          icon?: string
          id?: string
          lat: number
          lng: number
          name: string
          radius_m?: number
        }
        Update: {
          couple_space_id?: string
          created_at?: string
          created_by?: string
          icon?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          radius_m?: number
        }
        Relationships: [
          {
            foreignKeyName: "favorite_places_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          enabled: boolean | null
          id: string
          key: string
          scope: string
          target_id: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          key: string
          scope: string
          target_id?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          key?: string
          scope?: string
          target_id?: string | null
        }
        Relationships: []
      }
      feature_tiers: {
        Row: {
          feature_id: string
          feature_label: string
          min_tier: number
          updated_at: string | null
        }
        Insert: {
          feature_id: string
          feature_label: string
          min_tier?: number
          updated_at?: string | null
        }
        Update: {
          feature_id?: string
          feature_label?: string
          min_tier?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      free_mode_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      guardian_state: {
        Row: {
          couple_space_id: string
          glow_color: string
          ring_enabled: boolean
          ring_unlocked: boolean
          updated_at: string
        }
        Insert: {
          couple_space_id: string
          glow_color?: string
          ring_enabled?: boolean
          ring_unlocked?: boolean
          updated_at?: string
        }
        Update: {
          couple_space_id?: string
          glow_color?: string
          ring_enabled?: boolean
          ring_unlocked?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_state_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: true
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verifications: {
        Row: {
          admin_notes: string | null
          age: number | null
          created_at: string | null
          document_back_url: string | null
          document_type: string | null
          document_url: string | null
          full_name: string | null
          id: string
          id_card_url: string | null
          id_number: string | null
          selfie_url: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          age?: number | null
          created_at?: string | null
          document_back_url?: string | null
          document_type?: string | null
          document_url?: string | null
          full_name?: string | null
          id?: string
          id_card_url?: string | null
          id_number?: string | null
          selfie_url?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          age?: number | null
          created_at?: string | null
          document_back_url?: string | null
          document_type?: string | null
          document_url?: string | null
          full_name?: string | null
          id?: string
          id_card_url?: string | null
          id_number?: string | null
          selfie_url?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      intimacy_logs: {
        Row: {
          couple_space_id: string
          created_at: string
          day_key: string
          id: string
          notes: string | null
          protection_method: string
          updated_at: string
          user_id: string
        }
        Insert: {
          couple_space_id: string
          created_at?: string
          day_key?: string
          id?: string
          notes?: string | null
          protection_method?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          couple_space_id?: string
          created_at?: string
          day_key?: string
          id?: string
          notes?: string | null
          protection_method?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intimacy_logs_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      library_banners: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          image_url: string | null
          link_book_id: string | null
          sort_order: number
          subtitle: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          image_url?: string | null
          link_book_id?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          image_url?: string | null
          link_book_id?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_banners_link_book_id_fkey"
            columns: ["link_book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      library_settings: {
        Row: {
          banner_enabled: boolean
          banner_image_url: string | null
          banner_link_book_id: string | null
          banner_subtitle: string | null
          banner_title: string | null
          grid_columns: number
          id: string
          updated_at: string
        }
        Insert: {
          banner_enabled?: boolean
          banner_image_url?: string | null
          banner_link_book_id?: string | null
          banner_subtitle?: string | null
          banner_title?: string | null
          grid_columns?: number
          id?: string
          updated_at?: string
        }
        Update: {
          banner_enabled?: boolean
          banner_image_url?: string | null
          banner_link_book_id?: string | null
          banner_subtitle?: string | null
          banner_title?: string | null
          grid_columns?: number
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_settings_banner_link_book_id_fkey"
            columns: ["banner_link_book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      location_events: {
        Row: {
          couple_space_id: string
          event_type: string
          id: string
          occurred_at: string
          place_name: string
          user_id: string
        }
        Insert: {
          couple_space_id: string
          event_type: string
          id?: string
          occurred_at?: string
          place_name: string
          user_id: string
        }
        Update: {
          couple_space_id?: string
          event_type?: string
          id?: string
          occurred_at?: string
          place_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_events_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      location_history: {
        Row: {
          couple_space_id: string
          id: string
          lat: number
          lng: number
          recorded_at: string
          speed_kmh: number | null
          user_id: string
        }
        Insert: {
          couple_space_id: string
          id?: string
          lat: number
          lng: number
          recorded_at?: string
          speed_kmh?: number | null
          user_id: string
        }
        Update: {
          couple_space_id?: string
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string
          speed_kmh?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_history_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      location_notification_prefs: {
        Row: {
          notify_arrives: boolean
          notify_leaves: boolean
          notify_proximity: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          notify_arrives?: boolean
          notify_leaves?: boolean
          notify_proximity?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          notify_arrives?: boolean
          notify_leaves?: boolean
          notify_proximity?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      love_events: {
        Row: {
          couple_space_id: string
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          couple_space_id: string
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          couple_space_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "love_events_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      love_missions: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          emoji: string | null
          id: string
          mission_type: string
          reward_points: number | null
          target_count: number
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          id?: string
          mission_type: string
          reward_points?: number | null
          target_count: number
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          id?: string
          mission_type?: string
          reward_points?: number | null
          target_count?: number
          title?: string
        }
        Relationships: []
      }
      love_points: {
        Row: {
          couple_space_id: string | null
          id: string
          points: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          couple_space_id?: string | null
          id?: string
          points?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          couple_space_id?: string | null
          id?: string
          points?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "love_points_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      love_points_history: {
        Row: {
          amount: number
          couple_space_id: string | null
          created_at: string
          id: string
          reason: string
          user_id: string | null
        }
        Insert: {
          amount: number
          couple_space_id?: string | null
          created_at?: string
          id?: string
          reason: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          couple_space_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "love_points_history_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      love_shields: {
        Row: {
          couple_space_id: string
          last_purchased_month: string | null
          last_replenished_month: string | null
          last_shield_used_date: string | null
          shields: number | null
          updated_at: string | null
        }
        Insert: {
          couple_space_id: string
          last_purchased_month?: string | null
          last_replenished_month?: string | null
          last_shield_used_date?: string | null
          shields?: number | null
          updated_at?: string | null
        }
        Update: {
          couple_space_id?: string
          last_purchased_month?: string | null
          last_replenished_month?: string | null
          last_shield_used_date?: string | null
          shields?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      love_wrapped: {
        Row: {
          challenges_completed: number | null
          couple_space_id: string
          generated_at: string | null
          id: string
          memories_count: number | null
          messages_count: number | null
          month: number
          mood_checkins: number | null
          streak_days: number | null
          top_mood: string | null
          year: number
        }
        Insert: {
          challenges_completed?: number | null
          couple_space_id: string
          generated_at?: string | null
          id?: string
          memories_count?: number | null
          messages_count?: number | null
          month: number
          mood_checkins?: number | null
          streak_days?: number | null
          top_mood?: string | null
          year: number
        }
        Update: {
          challenges_completed?: number | null
          couple_space_id?: string
          generated_at?: string | null
          id?: string
          memories_count?: number | null
          messages_count?: number | null
          month?: number
          mood_checkins?: number | null
          streak_days?: number | null
          top_mood?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "love_wrapped_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lovepoints_ledger: {
        Row: {
          amount: number
          couple_space_id: string
          created_at: string
          description: string | null
          id: string
          source: string
          user_id: string | null
        }
        Insert: {
          amount: number
          couple_space_id: string
          created_at?: string
          description?: string | null
          id?: string
          source: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          couple_space_id?: string
          created_at?: string
          description?: string | null
          id?: string
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lovepoints_ledger_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_moments: {
        Row: {
          couple_space_id: string
          id: string
          met_at: string
          place_name: string | null
        }
        Insert: {
          couple_space_id: string
          id?: string
          met_at?: string
          place_name?: string | null
        }
        Update: {
          couple_space_id?: string
          id?: string
          met_at?: string
          place_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_moments_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      member_locations: {
        Row: {
          accuracy: number | null
          address: string | null
          battery_level: number | null
          couple_space_id: string
          id: string
          is_charging: boolean | null
          lat: number
          lng: number
          network_type: string | null
          sharing_enabled: boolean
          speed_kmh: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          address?: string | null
          battery_level?: number | null
          couple_space_id: string
          id?: string
          is_charging?: boolean | null
          lat: number
          lng: number
          network_type?: string | null
          sharing_enabled?: boolean
          speed_kmh?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          address?: string | null
          battery_level?: number | null
          couple_space_id?: string
          id?: string
          is_charging?: boolean | null
          lat?: number
          lng?: number
          network_type?: string | null
          sharing_enabled?: boolean
          speed_kmh?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_locations_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          couple_space_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          couple_space_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          couple_space_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_url: string | null
          content: string
          couple_space_id: string
          created_at: string
          id: string
          image_url: string | null
          is_deleted: boolean
          is_edited: boolean
          is_pinned: boolean
          reply_to_id: string | null
          sender_user_id: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          content?: string
          couple_space_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_edited?: boolean
          is_pinned?: boolean
          reply_to_id?: string | null
          sender_user_id: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          content?: string
          couple_space_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_edited?: boolean
          is_pinned?: boolean
          reply_to_id?: string | null
          sender_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_challenge_completions: {
        Row: {
          challenge_id: string
          completed: boolean
          couple_space_id: string
          created_at: string
          day_key: string
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          couple_space_id: string
          created_at?: string
          day_key?: string
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          couple_space_id?: string
          created_at?: string
          day_key?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "micro_challenge_completions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "micro_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "micro_challenge_completions_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_challenges: {
        Row: {
          challenge_text: string
          challenge_type: string
          created_at: string
          emoji: string | null
          id: string
          min_requirement: number | null
          points: number
          trigger_type: string | null
        }
        Insert: {
          challenge_text: string
          challenge_type?: string
          created_at?: string
          emoji?: string | null
          id?: string
          min_requirement?: number | null
          points?: number
          trigger_type?: string | null
        }
        Update: {
          challenge_text?: string
          challenge_type?: string
          created_at?: string
          emoji?: string | null
          id?: string
          min_requirement?: number | null
          points?: number
          trigger_type?: string | null
        }
        Relationships: []
      }
      mission_completions: {
        Row: {
          completed_at: string
          couple_space_id: string
          created_at: string | null
          id: string
          mission_id: string
          user_id: string
        }
        Insert: {
          completed_at: string
          couple_space_id: string
          created_at?: string | null
          id?: string
          mission_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          couple_space_id?: string
          created_at?: string | null
          id?: string
          mission_id?: string
          user_id?: string
        }
        Relationships: []
      }
      mood_checkins: {
        Row: {
          activities: string[] | null
          couple_space_id: string
          created_at: string
          day_key: string
          emotions: string[] | null
          id: string
          mood_key: string
          mood_percent: number
          note: string | null
          sleep_quality: string | null
          user_id: string
        }
        Insert: {
          activities?: string[] | null
          couple_space_id: string
          created_at?: string
          day_key?: string
          emotions?: string[] | null
          id?: string
          mood_key: string
          mood_percent: number
          note?: string | null
          sleep_quality?: string | null
          user_id: string
        }
        Update: {
          activities?: string[] | null
          couple_space_id?: string
          created_at?: string
          day_key?: string
          emotions?: string[] | null
          id?: string
          mood_key?: string
          mood_percent?: number
          note?: string | null
          sleep_quality?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_checkins_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_history: {
        Row: {
          couple_space_id: string
          id: string
          rule_key: string
          sent_at: string
          user_id: string
        }
        Insert: {
          couple_space_id: string
          id?: string
          rule_key: string
          sent_at?: string
          user_id: string
        }
        Update: {
          couple_space_id?: string
          id?: string
          rule_key?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_history_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          category: string
          enabled: boolean
          id: string
          preferred_hour: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          enabled?: boolean
          id?: string
          preferred_hour?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          enabled?: boolean
          id?: string
          preferred_hour?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_active: boolean | null
          key: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          account_name: string | null
          emola_number: string | null
          id: string
          mkesh_number: string | null
          mpesa_number: string | null
          updated_at: string | null
          whatsapp_message_template: string | null
          whatsapp_number: string | null
        }
        Insert: {
          account_name?: string | null
          emola_number?: string | null
          id?: string
          mkesh_number?: string | null
          mpesa_number?: string | null
          updated_at?: string | null
          whatsapp_message_template?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          account_name?: string | null
          emola_number?: string | null
          id?: string
          mkesh_number?: string | null
          mpesa_number?: string | null
          updated_at?: string | null
          whatsapp_message_template?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          admin_notes: string | null
          amount: string
          couple_space_id: string
          created_at: string | null
          external_id: string | null
          id: string
          method: string
          plan_name: string
          proof_url: string | null
          provider: string
          status: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: string
          couple_space_id: string
          created_at?: string | null
          external_id?: string | null
          id?: string
          method: string
          plan_name: string
          proof_url?: string | null
          provider?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: string
          couple_space_id?: string
          created_at?: string | null
          external_id?: string | null
          id?: string
          method?: string
          plan_name?: string
          proof_url?: string | null
          provider?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      period_entries: {
        Row: {
          couple_space_id: string
          created_at: string
          end_date: string | null
          flow_level: string
          id: string
          notes: string | null
          pain_level: number
          pms_level: number
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          couple_space_id: string
          created_at?: string
          end_date?: string | null
          flow_level?: string
          id?: string
          notes?: string | null
          pain_level?: number
          pms_level?: number
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          couple_space_id?: string
          created_at?: string
          end_date?: string | null
          flow_level?: string
          id?: string
          notes?: string | null
          pain_level?: number
          pms_level?: number
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "period_entries_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_comments: {
        Row: {
          content: string
          couple_space_id: string
          created_at: string
          id: string
          photo_id: string
          user_id: string
        }
        Insert: {
          content: string
          couple_space_id: string
          created_at?: string
          id?: string
          photo_id: string
          user_id: string
        }
        Update: {
          content?: string
          couple_space_id?: string
          created_at?: string
          id?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_comments_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_comments_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_reactions: {
        Row: {
          couple_space_id: string
          created_at: string
          id: string
          photo_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          couple_space_id: string
          created_at?: string
          id?: string
          photo_id: string
          reaction: string
          user_id: string
        }
        Update: {
          couple_space_id?: string
          created_at?: string
          id?: string
          photo_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_reactions_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_reactions_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          album_id: string | null
          caption: string | null
          couple_space_id: string
          created_at: string
          file_path: string
          id: string
          taken_on: string | null
          uploaded_by: string
        }
        Insert: {
          album_id?: string | null
          caption?: string | null
          couple_space_id: string
          created_at?: string
          file_path: string
          id?: string
          taken_on?: string | null
          uploaded_by: string
        }
        Update: {
          album_id?: string | null
          caption?: string | null
          couple_space_id?: string
          created_at?: string
          file_path?: string
          id?: string
          taken_on?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_items: {
        Row: {
          category: string | null
          completed: boolean | null
          couple_space_id: string | null
          created_at: string | null
          description: string | null
          for_whom: string | null
          id: string
          is_important: boolean | null
          plan_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          completed?: boolean | null
          couple_space_id?: string | null
          created_at?: string | null
          description?: string | null
          for_whom?: string | null
          id?: string
          is_important?: boolean | null
          plan_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          completed?: boolean | null
          couple_space_id?: string | null
          created_at?: string | null
          description?: string | null
          for_whom?: string | null
          id?: string
          is_important?: boolean | null
          plan_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plano_items_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      points: {
        Row: {
          couple_space_id: string
          id: string
          total_points: number
          updated_at: string
        }
        Insert: {
          couple_space_id: string
          id?: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          couple_space_id?: string
          id?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          birthday: string | null
          country: string | null
          country_code: string | null
          created_at: string
          display_name: string | null
          gender: string | null
          language_preference: string | null
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          primary_goal: string | null
          referral_code: string | null
          referred_by_id: string | null
          religion: string | null
          timezone: string | null
          updated_at: string
          usage_mode: string | null
          user_id: string
          verification_status: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          birthday?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          language_preference?: string | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          primary_goal?: string | null
          referral_code?: string | null
          referred_by_id?: string | null
          religion?: string | null
          timezone?: string | null
          updated_at?: string
          usage_mode?: string | null
          user_id: string
          verification_status?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          birthday?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          language_preference?: string | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          primary_goal?: string | null
          referral_code?: string | null
          referred_by_id?: string | null
          religion?: string | null
          timezone?: string | null
          updated_at?: string
          usage_mode?: string | null
          user_id?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          couple_space_id: string
          created_at: string
          endpoint: string | null
          fcm_token: string | null
          id: string
          p256dh: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth?: string | null
          couple_space_id: string
          created_at?: string
          endpoint?: string | null
          fcm_token?: string | null
          id?: string
          p256dh?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string | null
          couple_space_id?: string
          created_at?: string
          endpoint?: string | null
          fcm_token?: string | null
          id?: string
          p256dh?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pwa_tutorial_settings: {
        Row: {
          android_video_url: string | null
          created_at: string | null
          id: string
          ios_video_url: string | null
          is_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          android_video_url?: string | null
          created_at?: string | null
          id?: string
          ios_video_url?: string | null
          is_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          android_video_url?: string | null
          created_at?: string | null
          id?: string
          ios_video_url?: string | null
          is_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          new_user_id: string | null
          points_awarded: boolean | null
          referrer_user_id: string | null
          reward_given: boolean
        }
        Insert: {
          created_at?: string | null
          id?: string
          new_user_id?: string | null
          points_awarded?: boolean | null
          referrer_user_id?: string | null
          reward_given?: boolean
        }
        Update: {
          created_at?: string | null
          id?: string
          new_user_id?: string | null
          points_awarded?: boolean | null
          referrer_user_id?: string | null
          reward_given?: boolean
        }
        Relationships: []
      }
      relationship_events: {
        Row: {
          couple_space_id: string
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          event_type: string
          id: string
          image_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          couple_space_id: string
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          event_type?: string
          id?: string
          image_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          couple_space_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          image_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_events_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_milestones: {
        Row: {
          couple_space_id: string
          created_at: string
          id: string
          milestone_type: string
          milestone_value: number
        }
        Insert: {
          couple_space_id: string
          created_at?: string
          id?: string
          milestone_type: string
          milestone_value: number
        }
        Update: {
          couple_space_id?: string
          created_at?: string
          id?: string
          milestone_type?: string
          milestone_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "relationship_milestones_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_day_logs: {
        Row: {
          checked_item_ids: string[]
          completion_rate: number
          couple_space_id: string | null
          created_at: string
          day: string
          id: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checked_item_ids?: string[]
          completion_rate?: number
          couple_space_id?: string | null
          created_at?: string
          day: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checked_item_ids?: string[]
          completion_rate?: number
          couple_space_id?: string | null
          created_at?: string
          day?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_day_logs_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_items: {
        Row: {
          active: boolean
          couple_space_id: string | null
          created_at: string
          emoji: string | null
          id: string
          position: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          couple_space_id?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          position?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          couple_space_id?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_items_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_logs: {
        Row: {
          completed_at: string | null
          day_key: string
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          day_key?: string
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          day_key?: string
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: []
      }
      routines: {
        Row: {
          couple_space_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          couple_space_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          couple_space_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_blocks: {
        Row: {
          category: string
          couple_space_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_recurring: boolean
          location: string | null
          notes: string | null
          start_time: string
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          couple_space_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_recurring?: boolean
          location?: string | null
          notes?: string | null
          start_time: string
          title: string
          user_id: string
        }
        Update: {
          category?: string
          couple_space_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_recurring?: boolean
          location?: string | null
          notes?: string | null
          start_time?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shields: {
        Row: {
          couple_id: string | null
          couple_space_id: string | null
          id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          couple_id?: string | null
          couple_space_id?: string | null
          id?: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          couple_id?: string | null
          couple_space_id?: string | null
          id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shields_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: true
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_purchases: {
        Row: {
          couple_space_id: string
          id: string
          item_key: string
          price_paid: number
          purchased_at: string
          user_id: string | null
        }
        Insert: {
          couple_space_id: string
          id?: string
          item_key: string
          price_paid: number
          purchased_at?: string
          user_id?: string | null
        }
        Update: {
          couple_space_id?: string
          id?: string
          item_key?: string
          price_paid?: number
          purchased_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_purchases_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_type: string | null
          created_at: string
          features: string[] | null
          id: string
          is_active: boolean | null
          name: string
          price: string
          price_mzn: number | null
          tier_level: number
        }
        Insert: {
          billing_type?: string | null
          created_at?: string
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          price: string
          price_mzn?: number | null
          tier_level?: number
        }
        Update: {
          billing_type?: string | null
          created_at?: string
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: string
          price_mzn?: number | null
          tier_level?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          couple_space_id: string
          created_at: string
          created_by: string
          done_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority: number
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          couple_space_id: string
          created_at?: string
          created_by: string
          done_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: number
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          couple_space_id?: string
          created_at?: string
          created_by?: string
          done_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      time_capsule_messages: {
        Row: {
          couple_space_id: string
          created_at: string | null
          creator_id: string
          id: string
          image_url: string | null
          is_unlocked: boolean | null
          message: string
          unlock_date: string
        }
        Insert: {
          couple_space_id: string
          created_at?: string | null
          creator_id: string
          id?: string
          image_url?: string | null
          is_unlocked?: boolean | null
          message: string
          unlock_date: string
        }
        Update: {
          couple_space_id?: string
          created_at?: string | null
          creator_id?: string
          id?: string
          image_url?: string | null
          is_unlocked?: boolean | null
          message?: string
          unlock_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_capsule_messages_couple_space_id_fkey"
            columns: ["couple_space_id"]
            isOneToOne: false
            referencedRelation: "couple_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_items: {
        Row: {
          loveshield_count: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          loveshield_count?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          loveshield_count?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_trial: {
        Args: { p_couple_space_id: string }
        Returns: undefined
      }
      admin_approve_payment: {
        Args: {
          p_payment_id: string
          p_plan_id?: string
          p_tier_level?: number
        }
        Returns: undefined
      }
      admin_assign_plan: {
        Args: {
          p_couple_space_id: string
          p_plan_id: string
          p_tier_level: number
          p_trial_days?: number
        }
        Returns: undefined
      }
      admin_reject_payment: {
        Args: { p_notes?: string; p_payment_id: string }
        Returns: undefined
      }
      admin_remove_plan: {
        Args: { p_couple_space_id: string }
        Returns: undefined
      }
      admin_set_suspended: {
        Args: { p_couple_space_id: string; p_suspended: boolean }
        Returns: undefined
      }
      admin_set_verified: {
        Args: { p_couple_space_id: string; p_verified: boolean }
        Returns: undefined
      }
      are_users_in_same_couple_space: {
        Args: { _other_user_id: string }
        Returns: boolean
      }
      award_lovepoints: {
        Args: {
          p_amount: number
          p_couple_space_id: string
          p_description?: string
          p_source: string
          p_user_id?: string
        }
        Returns: undefined
      }
      buy_guardian_item: {
        Args: {
          p_couple_space_id: string
          p_item_key: string
          p_user_id?: string
        }
        Returns: Json
      }
      checkdailyinteraction: { Args: { p_couple_id: string }; Returns: boolean }
      checkmissioncompletion: {
        Args: {
          p_action_type?: string
          p_couple_space_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      cleanup_notification_history: { Args: never; Returns: undefined }
      current_couple_space_id: { Args: never; Returns: string }
      delete_chat_message: {
        Args: { p_message_id: string }
        Returns: undefined
      }
      delete_couple_space: {
        Args: { p_couple_space_id: string }
        Returns: undefined
      }
      edit_chat_message: {
        Args: { p_content: string; p_message_id: string }
        Returns: undefined
      }
      fn_buy_loveshield: {
        Args: { p_cost?: number; p_couple_space_id: string }
        Returns: Json
      }
      fn_count_active_members: {
        Args: { p_couple_id: string }
        Returns: number
      }
      fn_get_or_create_daily_missions_v5: {
        Args: { p_couple_space_id: string }
        Returns: {
          cdm_id: string
          completed: boolean
          description: string
          emoji: string
          mission_id: string
          mission_type: string
          progress: number
          reward_points: number
          target_count: number
          title: string
        }[]
      }
      fn_get_shields: { Args: { p_couple_id: string }; Returns: number }
      fn_increment_book_views: {
        Args: { p_book_id: string }
        Returns: undefined
      }
      generate_referral_code: { Args: never; Returns: string }
      generate_unique_referral_code: { Args: never; Returns: string }
      get_book_stats: {
        Args: { p_book_id: string }
        Returns: {
          avg_rating: number
          favorites_count: number
          ratings_count: number
        }[]
      }
      get_couple_activity_summary: {
        Args: { _couple_space_id: string }
        Returns: Json
      }
      get_couple_member_ids: {
        Args: { p_couple_space_id: string }
        Returns: {
          user_id: string
        }[]
      }
      get_lifetime_points: {
        Args: { p_couple_space_id: string }
        Returns: number
      }
      get_my_couple_space_id: { Args: never; Returns: string }
      get_ranking: { Args: { p_type?: string }; Returns: Json }
      get_reading_stats: {
        Args: { p_couple_space_id: string; p_user_id: string }
        Returns: {
          avg_completion: number
          books_completed: number
          books_started: number
          chapters_completed: number
          reading_days: number
          total_minutes: number
        }[]
      }
      get_streak: { Args: { p_couple_space_id: string }; Returns: Json }
      get_total_points: { Args: { p_couple_space_id: string }; Returns: number }
      get_user_couple_space_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_member_of_couple_space: {
        Args: { _couple_space_id: string }
        Returns: boolean
      }
      is_member_of_space: {
        Args: { _couple_space_id: string; _user_id: string }
        Returns: boolean
      }
      log_daily_activity: {
        Args: { p_couple_space_id: string; p_type?: string }
        Returns: Json
      }
      pin_chat_message: {
        Args: { p_is_pinned: boolean; p_message_id: string }
        Returns: undefined
      }
      record_perfect_day: {
        Args: { p_couple_space_id: string }
        Returns: undefined
      }
      safe_checkin: {
        Args: { p_couple_id: string; p_user_id: string }
        Returns: undefined
      }
      set_guardian_appearance: {
        Args: {
          p_couple_space_id: string
          p_glow_color?: string
          p_ring_enabled?: boolean
        }
        Returns: Json
      }
      update_streak: { Args: { p_couple_space_id: string }; Returns: undefined }
      upsert_feature_flag: {
        Args: {
          p_enabled: boolean
          p_key: string
          p_scope: string
          p_target_id?: string
        }
        Returns: Json
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
