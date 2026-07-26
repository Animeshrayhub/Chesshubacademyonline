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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          published_at: string | null
          slug: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          assigned_coach_id: string | null
          created_at: string
          id: string
          parent_email: string
          parent_name: string
          parent_phone: string
          preferred_time: string
          status: string | null
          student_age: number
          student_name: string
          zoom_meeting_url: string | null
        }
        Insert: {
          assigned_coach_id?: string | null
          created_at?: string
          id?: string
          parent_email: string
          parent_name: string
          parent_phone: string
          preferred_time: string
          status?: string | null
          student_age: number
          student_name: string
          zoom_meeting_url?: string | null
        }
        Update: {
          assigned_coach_id?: string | null
          created_at?: string
          id?: string
          parent_email?: string
          parent_name?: string
          parent_phone?: string
          preferred_time?: string
          status?: string | null
          student_age?: number
          student_name?: string
          zoom_meeting_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_assigned_coach_id_fkey"
            columns: ["assigned_coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_attendance: {
        Row: {
          archived_at: string | null
          class_report_id: string
          created_at: string
          feedback: string | null
          id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          class_report_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          status: string
          student_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          class_report_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_attendance_class_report_id_fkey"
            columns: ["class_report_id"]
            isOneToOne: false
            referencedRelation: "class_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_recordings: {
        Row: {
          archived_at: string | null
          class_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          recorded_date: string
          recording_source: string
          recording_url: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          class_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          recorded_date: string
          recording_source: string
          recording_url: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          class_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          recorded_date?: string
          recording_source?: string
          recording_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_recordings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_reports: {
        Row: {
          archived_at: string | null
          class_id: string
          coach_id: string
          created_at: string
          id: string
          locked_at: string
          notes: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          class_id: string
          coach_id: string
          created_at?: string
          id?: string
          locked_at?: string
          notes: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          class_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          locked_at?: string
          notes?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_reports_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_reports_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_students: {
        Row: {
          archived_at: string | null
          class_id: string
          created_at: string
          id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          class_id: string
          created_at?: string
          id?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          class_id?: string
          created_at?: string
          id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          archived_at: string | null
          class_type: string
          coach_id: string
          created_at: string
          duration_minutes: number
          id: string
          scheduled_start: string
          status: string | null
          updated_at: string
          weekly_schedule_id: string | null
          zoom_join_url: string | null
          zoom_meeting_id: string | null
          zoom_start_url: string | null
        }
        Insert: {
          archived_at?: string | null
          class_type: string
          coach_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          scheduled_start: string
          status?: string | null
          updated_at?: string
          weekly_schedule_id?: string | null
          zoom_join_url?: string | null
          zoom_meeting_id?: string | null
          zoom_start_url?: string | null
        }
        Update: {
          archived_at?: string | null
          class_type?: string
          coach_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          scheduled_start?: string
          status?: string | null
          updated_at?: string
          weekly_schedule_id?: string | null
          zoom_join_url?: string | null
          zoom_meeting_id?: string | null
          zoom_start_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_weekly_schedule_id_fkey"
            columns: ["weekly_schedule_id"]
            isOneToOne: false
            referencedRelation: "weekly_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_profiles: {
        Row: {
          archived_at: string | null
          bio: string
          created_at: string
          experience_years: number
          id: string
          languages: Json
          photo_url: string | null
          title: string
          updated_at: string
          user_id: string
          whatsapp: string
        }
        Insert: {
          archived_at?: string | null
          bio: string
          created_at?: string
          experience_years: number
          id?: string
          languages: Json
          photo_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          whatsapp: string
        }
        Update: {
          archived_at?: string | null
          bio?: string
          created_at?: string
          experience_years?: number
          id?: string
          languages?: Json
          photo_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_student_assignments: {
        Row: {
          archived_at: string | null
          coach_id: string
          created_at: string
          id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          coach_id: string
          created_at?: string
          id?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_student_assignments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_student_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_assignments: {
        Row: {
          assigned_at: string
          chapter_id: string
          coach_id: string | null
          due_at: string | null
          id: string
          status: string | null
          student_id: string
          unlocked: boolean
        }
        Insert: {
          assigned_at?: string
          chapter_id: string
          coach_id?: string | null
          due_at?: string | null
          id?: string
          status?: string | null
          student_id: string
          unlocked?: boolean
        }
        Update: {
          assigned_at?: string
          chapter_id?: string
          coach_id?: string | null
          due_at?: string | null
          id?: string
          status?: string | null
          student_id?: string
          unlocked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "homework_assignments_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "homework_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_assignments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_chapters: {
        Row: {
          chapter_number: number
          created_at: string
          description: string | null
          id: string
          questions_count: number
          title: string
          workbook_id: string
        }
        Insert: {
          chapter_number: number
          created_at?: string
          description?: string | null
          id?: string
          questions_count?: number
          title: string
          workbook_id: string
        }
        Update: {
          chapter_number?: number
          created_at?: string
          description?: string | null
          id?: string
          questions_count?: number
          title?: string
          workbook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_chapters_workbook_id_fkey"
            columns: ["workbook_id"]
            isOneToOne: false
            referencedRelation: "homework_workbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          answers: string
          assignment_id: string
          coach_feedback: string | null
          grade_score: number | null
          id: string
          pdf_submission_path: string | null
          reviewed_at: string | null
          submitted_at: string
        }
        Insert: {
          answers: string
          assignment_id: string
          coach_feedback?: string | null
          grade_score?: number | null
          id?: string
          pdf_submission_path?: string | null
          reviewed_at?: string | null
          submitted_at?: string
        }
        Update: {
          answers?: string
          assignment_id?: string
          coach_feedback?: string | null
          grade_score?: number | null
          id?: string
          pdf_submission_path?: string | null
          reviewed_at?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "homework_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_workbooks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          pdf_storage_path: string | null
          title: string
          track: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          pdf_storage_path?: string | null
          title: string
          track: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          pdf_storage_path?: string | null
          title?: string
          track?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          age: number
          archived_at: string | null
          created_at: string
          id: string
          joined_date: string
          level: string
          notes: string | null
          parent_name: string
          parent_whatsapp: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age: number
          archived_at?: string | null
          created_at?: string
          id?: string
          joined_date?: string
          level: string
          notes?: string | null
          parent_name: string
          parent_whatsapp: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number
          archived_at?: string | null
          created_at?: string
          id?: string
          joined_date?: string
          level?: string
          notes?: string | null
          parent_name?: string
          parent_whatsapp?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          archived_at: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          password: string
          role: string
          updated_at: string
          username: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          password: string
          role: string
          updated_at?: string
          username: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          password?: string
          role?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      weekly_schedule_students: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          student_id: string
          updated_at: string
          weekly_schedule_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          student_id: string
          updated_at?: string
          weekly_schedule_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          student_id?: string
          updated_at?: string
          weekly_schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_schedule_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_schedule_students_weekly_schedule_id_fkey"
            columns: ["weekly_schedule_id"]
            isOneToOne: false
            referencedRelation: "weekly_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_schedules: {
        Row: {
          archived_at: string | null
          class_type: string
          coach_id: string
          created_at: string
          day_of_week: number
          duration_minutes: number
          id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          class_type: string
          coach_id: string
          created_at?: string
          day_of_week: number
          duration_minutes: number
          id?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          class_type?: string
          coach_id?: string
          created_at?: string
          day_of_week?: number
          duration_minutes?: number
          id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_schedules_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_role: { Args: never; Returns: string }
      get_auth_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_coach: { Args: never; Returns: boolean }
      is_student: { Args: never; Returns: boolean }
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
