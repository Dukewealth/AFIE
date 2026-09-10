export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      merchants: {
        Row: {
          id: string;
          name: string;
          api_key: string;
          webhook_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          api_key: string;
          webhook_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          api_key?: string;
          webhook_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          merchant_id: string | null;
          external_tx_id: string;
          user_id: string;
          amount: number;
          currency: string;
          payment_method: string;
          ip_address: string | null;
          device_fingerprint: string | null;
          country_code: string | null;
          status: string;
          risk_score: number;
          decision_reason: string | null;
          latency_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id?: string | null;
          external_tx_id: string;
          user_id: string;
          amount: number;
          currency?: string;
          payment_method: string;
          ip_address?: string | null;
          device_fingerprint?: string | null;
          country_code?: string | null;
          status: string;
          risk_score: number;
          decision_reason?: string | null;
          latency_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string | null;
          external_tx_id?: string;
          user_id?: string;
          amount?: number;
          currency?: string;
          payment_method?: string;
          ip_address?: string | null;
          device_fingerprint?: string | null;
          country_code?: string | null;
          status?: string;
          risk_score?: number;
          decision_reason?: string | null;
          latency_ms?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_merchant_id_fkey";
            columns: ["merchant_id"];
            isOneToOne: false;
            referencedRelation: "merchants";
            referencedColumns: ["id"];
          },
        ];
      };
      risk_rules: {
        Row: {
          id: string;
          merchant_id: string | null;
          name: string;
          rule_type: string;
          parameters: Json;
          action: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id?: string | null;
          name: string;
          rule_type: string;
          parameters: Json;
          action: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string | null;
          name?: string;
          rule_type?: string;
          parameters?: Json;
          action?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "risk_rules_merchant_id_fkey";
            columns: ["merchant_id"];
            isOneToOne: false;
            referencedRelation: "merchants";
            referencedColumns: ["id"];
          },
        ];
      };
      fraud_patterns: {
        Row: {
          id: string;
          pattern_name: string;
          description: string;
          embedding: number[] | null;
          severity: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          pattern_name: string;
          description: string;
          embedding?: number[] | null;
          severity?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pattern_name?: string;
          description?: string;
          embedding?: number[] | null;
          severity?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          transaction_id: string | null;
          stage: string;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id?: string | null;
          stage: string;
          details: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string | null;
          stage?: string;
          details?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Merchant = Database["public"]["Tables"]["merchants"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
