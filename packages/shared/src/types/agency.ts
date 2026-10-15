export type AgencyTier = 'starter' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface IAgencyTierConfig {
  tier: AgencyTier;
  label: string;
  agencyPercent: number;
  adminPercent: number;
  hostPercent: number;
  minHosts: number;
  criteria: string;
}

export interface IAgency {
  _id: string;
  agentId: string | { _id: string; uid: string; nickname: string; avatar?: string };
  name: string;
  code: string;
  commission: number;
  tier?: AgencyTier;
  hosts: string[];
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JoinAgencyInput {
  code: string;
}

