export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
  public: {
    Tables: {
      categories: {
        Row: {
          archived_at: string | null
          budget: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          budget: string
          created_at?: string
          id: string
          name: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          budget?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: string
          category_id: string | null
          created_at: string
          description: string
          fixed_expense_id: string | null
          id: string
          spent_on: string
          user_id: string
        }
        Insert: {
          amount: string
          category_id?: string | null
          created_at?: string
          description: string
          fixed_expense_id?: string | null
          id: string
          spent_on: string
          user_id?: string
        }
        Update: {
          amount?: string
          category_id?: string | null
          created_at?: string
          description?: string
          fixed_expense_id?: string | null
          id?: string
          spent_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'expenses_category_id_user_id_fkey'
            columns: ['category_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id', 'user_id']
          },
          {
            foreignKeyName: 'expenses_fixed_expense_id_user_id_fkey'
            columns: ['fixed_expense_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'fixed_expenses'
            referencedColumns: ['id', 'user_id']
          },
        ]
      }
      finance_settings: {
        Row: {
          created_at: string
          monthly_income: string
          onboarded_at: string | null
          payday: number
          user_id: string
        }
        Insert: {
          created_at?: string
          monthly_income: string
          onboarded_at?: string | null
          payday: number
          user_id?: string
        }
        Update: {
          created_at?: string
          monthly_income?: string
          onboarded_at?: string | null
          payday?: number
          user_id?: string
        }
        Relationships: []
      }
      fixed_expenses: {
        Row: {
          amount: string
          archived_at: string | null
          created_at: string
          due_day: number
          id: string
          is_investment: boolean
          name: string
          user_id: string
        }
        Insert: {
          amount: string
          archived_at?: string | null
          created_at?: string
          due_day: number
          id: string
          is_investment?: boolean
          name: string
          user_id?: string
        }
        Update: {
          amount?: string
          archived_at?: string | null
          created_at?: string
          due_day?: number
          id?: string
          is_investment?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount: string
          created_at: string
          description: string
          id: string
          received_on: string
          user_id: string
        }
        Insert: {
          amount: string
          created_at?: string
          description: string
          id: string
          received_on: string
          user_id?: string
        }
        Update: {
          amount?: string
          created_at?: string
          description?: string
          id?: string
          received_on?: string
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          has_investments: boolean
          monthly_contribution: string
          total_balance: string
          user_id: string
        }
        Insert: {
          has_investments?: boolean
          monthly_contribution: string
          total_balance: string
          user_id?: string
        }
        Update: {
          has_investments?: boolean
          monthly_contribution?: string
          total_balance?: string
          user_id?: string
        }
        Relationships: []
      }
      recovery_codes: {
        Row: {
          auth_hash: string
          code: string
          created_at: string
          id: string
          iv: string
          user_id: string
          wrapped_key: string
        }
        Insert: {
          auth_hash: string
          code: string
          created_at?: string
          id: string
          iv: string
          user_id?: string
          wrapped_key: string
        }
        Update: {
          auth_hash?: string
          code?: string
          created_at?: string
          id?: string
          iv?: string
          user_id?: string
          wrapped_key?: string
        }
        Relationships: []
      }
      user_keys: {
        Row: {
          created_at: string
          iv: string
          kdf_iterations: number
          user_id: string
          wrapped_key: string
        }
        Insert: {
          created_at?: string
          iv: string
          kdf_iterations: number
          user_id: string
          wrapped_key: string
        }
        Update: {
          created_at?: string
          iv?: string
          kdf_iterations?: number
          user_id?: string
          wrapped_key?: string
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
