export interface Organization {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  status: 'ACTIVE' | 'SUSPENDED';
  workspaceCount: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationCreateRequest {
  name: string;
  timezone: string;
  currency: string;
}

export interface OrganizationUpdateRequest {
  name?: string;
  timezone?: string;
  currency?: string;
  status?: 'ACTIVE' | 'SUSPENDED';
}

export interface Workspace {
  id: string;
  orgId: string;
  name: string;
  market: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceCreateRequest {
  name: string;
  market?: string;
}

export interface WorkspaceUpdateRequest {
  name?: string;
  market?: string;
}

export type MemberRole =
  | 'ORG_ADMIN'
  | 'WORKSPACE_ADMIN'
  | 'EDITOR'
  | 'ANALYST'
  | 'APPROVER'
  | 'VIEWER';

export type UserStatus = 'ACTIVE' | 'INVITED' | 'DISABLED';
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface MemberDetail {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string;
  userStatus: UserStatus;
  role: MemberRole;
  orgId: string;
  workspaceId: string | null;
  workspaceName: string | null;
  createdAt: string;
}

export interface MemberCreateRequest {
  email: string;
  fullName?: string;
  role: MemberRole;
  workspaceId?: string;
}

export interface MemberUpdateRequest {
  role: MemberRole;
}

export interface Membership {
  id: string;
  userId: string;
  orgId: string;
  workspaceId: string | null;
  role: MemberRole;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  status: UserStatus;
  memberships: Membership[];
  createdAt: string;
  updatedAt: string;
}

export interface Invite {
  id: string;
  orgId: string;
  workspaceId: string | null;
  email: string;
  role: MemberRole;
  status: InviteStatus;
  inviteLink: string | null;
  invitedByUserId: string;
  expiresAt: string;
  createdAt: string;
}

export interface InviteCreateRequest {
  email: string;
  role: MemberRole;
  workspaceId?: string;
  expiresInDays?: number;
}

export interface InviteAcceptRequest {
  token: string;
  fullName: string;
  password: string;
}

export interface Team {
  id: string;
  orgId: string;
  workspaceId: string | null;
  name: string;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  userId: string;
  email: string;
  fullName: string;
  addedAt: string;
}

export interface TeamCreateRequest {
  name: string;
  workspaceId?: string;
}

export interface AuditLogEntry {
  id: string;
  orgId: string;
  workspaceId: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  last: boolean;
}

export const MEMBER_ROLES: MemberRole[] = [
  'ORG_ADMIN',
  'WORKSPACE_ADMIN',
  'EDITOR',
  'ANALYST',
  'APPROVER',
  'VIEWER',
];
