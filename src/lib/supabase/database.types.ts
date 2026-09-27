// Generado con `pnpm db:types`. No editar a mano.
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
      profiles: {
        Row: { created_at: string; id: string; role_id: number }
        Insert: { created_at?: string; id: string; role_id: number }
        Update: { created_at?: string; id?: string; role_id?: number }
        Relationships: [
          {
            foreignKeyName: 'profiles_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
        ]
      }
      roles: {
        Row: { created_at: string; id: number; role_slug: string }
        Insert: { created_at?: string; id?: never; role_slug: string }
        Update: { created_at?: string; id?: never; role_slug?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
