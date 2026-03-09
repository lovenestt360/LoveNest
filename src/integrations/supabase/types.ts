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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
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
      couple_spaces: {
        Row: {
          chat_wallpaper_opacity: number
          chat_wallpaper_url: string | null
          created_at: string
          id: string
          invite_code: string
          relationship_start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          chat_wallpaper_opacity?: number
          chat_wallpaper_url?: string | null
          created_at?: string
          id?: string
          invite_code: string
          relationship_start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          chat_wallpaper_opacity?: number
          chat_wallpaper_url?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          relationship_start_date?: string | null
          status?: string
          updated_at?: string
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
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
          label: string
          note: string | null
          priority: string
          profile_id: string
          sort_order: number
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          label: string
          note?: string | null
          priority?: string
          profile_id: string
          sort_order?: number
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          label?: string
          note?: string | null
          priority?: string
          profile_id?: string
          sort_order?: number
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
          is_active: boolean
          label: string
          profile_id: string
          section: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          profile_id: string
          section: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
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
      fasting_day_item_logs: {
        Row: {
          created_at: string
          day_log_id: string
          id: string
          label: string
          reason: string | null
          section: string
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
          section: string
          status: string
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
          section?: string
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
          result: string | null
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
          result?: string | null
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
          result?: string | null
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
          plan_name: string
          plan_type: string
          rules_allowed?: string | null
          rules_exceptions?: string | null
          rules_forbidden?: string | null
          start_date: string
          total_days: number
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
          alerta_calendario: boolean
          hora_terminar: boolean
          id: string
          motivacao_dia: boolean
          oracao: boolean
          reflexao_noturna: boolean
          registar_dia: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          alerta_calendario?: boolean
          hora_terminar?: boolean
          id?: string
          motivacao_dia?: boolean
          oracao?: boolean
          reflexao_noturna?: boolean
          registar_dia?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          alerta_calendario?: boolean
          hora_terminar?: boolean
          id?: string
          motivacao_dia?: boolean
          oracao?: boolean
          reflexao_noturna?: boolean
          registar_dia?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      mood_checkins: {
        Row: {
          activities: string[]
          couple_space_id: string
          created_at: string
          day_key: string
          emotions: string[]
          id: string
          mood_key: string
          mood_percent: number
          note: string | null
          sleep_quality: string | null
          user_id: string
        }
        Insert: {
          activities?: string[]
          couple_space_id: string
          created_at?: string
          day_key?: string
          emotions?: string[]
          id?: string
          mood_key: string
          mood_percent: number
          note?: string | null
          sleep_quality?: string | null
          user_id: string
        }
        Update: {
          activities?: string[]
          couple_space_id?: string
          created_at?: string
          day_key?: string
          emotions?: string[]
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
      profiles: {
        Row: {
          avatar_url: string | null
          birthday: string | null
          created_at: string
          display_name: string | null
          gender: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          couple_space_id: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          couple_space_id: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          couple_space_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
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
      routine_day_logs: {
        Row: {
          checked_item_ids: string[]
          completion_rate: number
          couple_space_id: string
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
          couple_space_id: string
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
          couple_space_id?: string
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
          couple_space_id: string
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
          couple_space_id: string
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
          couple_space_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_users_in_same_couple_space: {
        Args: { _other_user_id: string }
        Returns: boolean
      }
      current_couple_space_id: { Args: never; Returns: string }
      get_partner_cycle_summary: {
        Args: { _partner_user_id: string }
        Returns: Json
      }
      get_user_couple_space_id: { Args: never; Returns: string }
      is_member_of_couple_space: {
        Args: { _couple_space_id: string }
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
