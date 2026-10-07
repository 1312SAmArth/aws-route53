export type ZoneType = "PUBLIC" | "PRIVATE";
export type RoutingPolicy = "SIMPLE" | "WEIGHTED";

export const RECORD_TYPES = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

export interface User {
  username: string;
  account_id: string;
}

export interface HostedZone {
  id: string;
  name: string;
  type: ZoneType;
  comment: string | null;
  vpc_id: string | null;
  vpc_region: string | null;
  created_by: string;
  record_count: number;
  name_servers: string[];
  created_at: string;
  updated_at: string;
}

export interface HostedZoneInput {
  name: string;
  type: ZoneType;
  comment?: string | null;
  vpc_id?: string | null;
  vpc_region?: string | null;
}

export interface DnsRecord {
  id: number;
  hosted_zone_id: string;
  name: string;
  /** Includes SOA, which only exists as a read-only default record. */
  type: RecordType | "SOA";
  ttl: number | null;
  values: string[];
  routing_policy: RoutingPolicy;
  set_identifier: string | null;
  weight: number | null;
  alias_target: string | null;
  evaluate_target_health: boolean;
  comment: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecordInput {
  name: string;
  type: RecordType;
  ttl: number | null;
  values: string[];
  routing_policy: RoutingPolicy;
  set_identifier: string | null;
  weight: number | null;
  alias_target: string | null;
  evaluate_target_health: boolean;
  comment: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface FieldError {
  field: string;
  message: string;
}
