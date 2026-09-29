export interface IAgency {
  _id: string;
  agentId: string | { _id: string; uid: string; nickname: string; avatar?: string };
  name: string;
  code: string;
  commission: number;
  hosts: string[];
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JoinAgencyInput {
  code: string;
}
