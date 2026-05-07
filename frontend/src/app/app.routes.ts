import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'invite/accept',
    loadComponent: () =>
      import('./features/admin/pages/invite-accept.component').then((m) => m.InviteAcceptComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/auth/pages/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'integrations/oauth/callback',
        loadComponent: () =>
          import('./features/integrations/pages/oauth-callback.component').then(
            (m) => m.OauthCallbackComponent
          ),
      },
      {
        path: 'integrations/providers',
        loadComponent: () =>
          import('./features/integrations/pages/providers-list.component').then(
            (m) => m.ProvidersListComponent
          ),
      },
      {
        path: 'integrations/accounts/:id/resources',
        loadComponent: () =>
          import('./features/integrations/pages/resources-list.component').then(
            (m) => m.ResourcesListComponent
          ),
      },
      {
        path: 'integrations/accounts/:id',
        loadComponent: () =>
          import('./features/integrations/pages/account-detail.component').then(
            (m) => m.AccountDetailComponent
          ),
      },
      {
        path: 'integrations/accounts',
        loadComponent: () =>
          import('./features/integrations/pages/accounts-list.component').then(
            (m) => m.AccountsListComponent
          ),
      },
      {
        path: 'integrations/workspace-mappings',
        loadComponent: () =>
          import('./features/integrations/pages/workspace-mappings.component').then(
            (m) => m.WorkspaceMappingsComponent
          ),
      },
      {
        path: 'integrations/sync-jobs',
        loadComponent: () =>
          import('./features/integrations/pages/sync-jobs.component').then((m) => m.SyncJobsComponent),
      },
      {
        path: 'integrations/webhooks',
        loadComponent: () =>
          import('./features/integrations/pages/webhooks.component').then((m) => m.WebhooksComponent),
      },
      {
        path: 'integrations/entity-mappings',
        loadComponent: () =>
          import('./features/integrations/pages/entity-mappings.component').then(
            (m) => m.EntityMappingsComponent
          ),
      },
      {
        path: 'integrations/campaign-reports',
        loadComponent: () =>
          import('./features/integrations/pages/campaign-performance.component').then(
            (m) => m.CampaignPerformanceComponent
          ),
      },
      {
        path: 'integrations/health',
        loadComponent: () =>
          import('./features/integrations/pages/health-diagnostics.component').then(
            (m) => m.HealthDiagnosticsComponent
          ),
      },
      {
        path: 'integrations/oauth-configs',
        loadComponent: () =>
          import('./features/integrations/pages/oauth-configs.component').then(
            (m) => m.OauthConfigsComponent
          ),
      },
      {
        path: 'integrations',
        loadComponent: () =>
          import('./features/integrations/pages/integration-list.component').then(
            (m) => m.IntegrationListComponent
          ),
      },
      {
        path: 'integrations/:id',
        loadComponent: () =>
          import('./features/integrations/pages/integration-detail.component').then(
            (m) => m.IntegrationDetailComponent
          ),
      },
      {
        path: 'campaigns',
        loadComponent: () =>
          import('./features/campaigns/pages/campaign-list.component').then(
            (m) => m.CampaignListComponent
          ),
      },
      {
        path: 'campaigns/new',
        loadComponent: () =>
          import('./features/campaigns/pages/campaign-wizard.component').then(
            (m) => m.CampaignWizardComponent
          ),
      },
      {
        path: 'campaigns/:id',
        loadComponent: () =>
          import('./features/campaigns/pages/campaign-detail.component').then(
            (m) => m.CampaignDetailComponent
          ),
      },
      {
        path: 'creatives',
        loadComponent: () =>
          import('./features/campaigns/pages/sponsored-unit-list.component').then(
            (m) => m.SponsoredUnitListComponent
          ),
      },
      {
        path: 'approvals',
        loadComponent: () =>
          import('./features/approvals/pages/approval-list.component').then(
            (m) => m.ApprovalListComponent
          ),
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./features/events/pages/events-dashboard.component').then(
            (m) => m.EventsDashboardComponent
          ),
      },
      {
        path: 'governance/profile',
        loadComponent: () =>
          import('./features/governance/pages/brand-profile.component').then(
            (m) => m.BrandProfileComponent
          ),
      },
      {
        path: 'governance/assets',
        loadComponent: () =>
          import('./features/governance/pages/brand-assets.component').then(
            (m) => m.BrandAssetsComponent
          ),
      },
      {
        path: 'governance/rulesets/:id',
        loadComponent: () =>
          import('./features/governance/pages/ruleset-detail.component').then(
            (m) => m.RulesetDetailComponent
          ),
      },
      {
        path: 'governance/rulesets',
        loadComponent: () =>
          import('./features/governance/pages/rulesets-list.component').then(
            (m) => m.RulesetsListComponent
          ),
      },
      {
        path: 'governance/disclaimers',
        loadComponent: () =>
          import('./features/governance/pages/disclaimers.component').then(
            (m) => m.DisclaimersComponent
          ),
      },
      {
        path: 'governance/templates/:id',
        loadComponent: () =>
          import('./features/governance/pages/template-detail.component').then(
            (m) => m.TemplateDetailComponent
          ),
      },
      {
        path: 'governance/templates',
        loadComponent: () =>
          import('./features/governance/pages/templates-list.component').then(
            (m) => m.TemplatesListComponent
          ),
      },
      {
        path: 'governance/checks',
        loadComponent: () =>
          import('./features/governance/pages/governance-checks.component').then(
            (m) => m.GovernanceChecksComponent
          ),
      },
      {
        path: 'governance/platform-constraints',
        loadComponent: () =>
          import('./features/governance/pages/platform-constraints.component').then(
            (m) => m.PlatformConstraintsComponent
          ),
      },
      { path: 'research', redirectTo: 'research/overview', pathMatch: 'full' },
      {
        path: 'research/overview',
        loadComponent: () =>
          import('./features/research/pages/research-overview.component').then(
            (m) => m.ResearchOverviewComponent
          ),
      },
      {
        path: 'research/competitors/:id',
        loadComponent: () =>
          import('./features/research/pages/competitor-detail.component').then(
            (m) => m.CompetitorDetailComponent
          ),
      },
      {
        path: 'research/competitors',
        loadComponent: () =>
          import('./features/research/pages/competitors-list.component').then(
            (m) => m.CompetitorsListComponent
          ),
      },
      {
        path: 'research/sources/:sourceId',
        loadComponent: () =>
          import('./features/research/pages/source-detail.component').then(
            (m) => m.SourceDetailComponent
          ),
      },
      {
        path: 'research/sources',
        loadComponent: () =>
          import('./features/research/pages/sources-list.component').then(
            (m) => m.SourcesListComponent
          ),
      },
      {
        path: 'research/snapshots/:snapshotId',
        loadComponent: () =>
          import('./features/research/pages/snapshot-detail.component').then(
            (m) => m.SnapshotDetailComponent
          ),
      },
      {
        path: 'research/insights/:insightId',
        loadComponent: () =>
          import('./features/research/pages/insight-detail.component').then(
            (m) => m.InsightDetailComponent
          ),
      },
      {
        path: 'research/insights',
        loadComponent: () =>
          import('./features/research/pages/insights-list.component').then(
            (m) => m.InsightsListComponent
          ),
      },
      {
        path: 'research/keyword-clusters',
        loadComponent: () =>
          import('./features/research/pages/keyword-clusters.component').then(
            (m) => m.KeywordClustersComponent
          ),
      },
      {
        path: 'research/personas',
        loadComponent: () =>
          import('./features/research/pages/personas.component').then((m) => m.PersonasComponent),
      },
      {
        path: 'research/watchlists',
        loadComponent: () =>
          import('./features/research/pages/watchlists.component').then(
            (m) => m.WatchlistsComponent
          ),
      },
      {
        path: 'research/jobs',
        loadComponent: () =>
          import('./features/research/pages/research-jobs.component').then(
            (m) => m.ResearchJobsComponent
          ),
      },
      {
        path: 'research/links',
        loadComponent: () =>
          import('./features/research/pages/research-links.component').then(
            (m) => m.ResearchLinksComponent
          ),
      },
      {
        path: 'research/digests/:digestId',
        loadComponent: () =>
          import('./features/research/pages/digest-detail.component').then(
            (m) => m.DigestDetailComponent
          ),
      },
      {
        path: 'research/digests',
        loadComponent: () =>
          import('./features/research/pages/digests-list.component').then(
            (m) => m.DigestsListComponent
          ),
      },
      { path: 'admin', redirectTo: 'admin/orgs', pathMatch: 'full' },
      {
        path: 'admin/orgs',
        loadComponent: () =>
          import('./features/admin/pages/org-list.component').then((m) => m.OrgListComponent),
      },
      {
        path: 'admin/orgs/:orgId',
        loadComponent: () =>
          import('./features/admin/pages/org-detail.component').then((m) => m.OrgDetailComponent),
      },
      {
        path: 'admin/workspaces',
        loadComponent: () =>
          import('./features/admin/pages/workspace-list.component').then(
            (m) => m.WorkspaceListComponent
          ),
      },
      {
        path: 'admin/members',
        loadComponent: () =>
          import('./features/admin/pages/members.component').then((m) => m.MembersComponent),
      },
      {
        path: 'admin/invites',
        loadComponent: () =>
          import('./features/admin/pages/invites.component').then((m) => m.InvitesComponent),
      },
      {
        path: 'admin/teams',
        loadComponent: () =>
          import('./features/admin/pages/teams.component').then((m) => m.TeamsComponent),
      },
      {
        path: 'admin/audit',
        loadComponent: () =>
          import('./features/admin/pages/audit-log.component').then((m) => m.AuditLogComponent),
      },
      {
        path: 'ai/chat',
        loadComponent: () =>
          import('./features/ai/pages/chat-list.component').then((m) => m.ChatListComponent),
      },
      {
        path: 'ai/chat/:conversationId',
        loadComponent: () =>
          import('./features/ai/pages/chat-list.component').then((m) => m.ChatListComponent),
      },
      {
        path: 'ai/prompts',
        loadComponent: () =>
          import('./features/ai/pages/prompt-list.component').then((m) => m.PromptListComponent),
      },
      {
        path: 'ai/prompts/:promptId',
        loadComponent: () =>
          import('./features/ai/pages/prompt-detail.component').then((m) => m.PromptDetailComponent),
      },
      {
        path: 'ai/workflows',
        loadComponent: () =>
          import('./features/ai/pages/workflow-list.component').then((m) => m.WorkflowListComponent),
      },
      {
        path: 'ai/workflows/:workflowId',
        loadComponent: () =>
          import('./features/ai/pages/workflow-detail.component').then((m) => m.WorkflowDetailComponent),
      },
      {
        path: 'ai/proposals',
        loadComponent: () =>
          import('./features/ai/pages/proposals-list.component').then((m) => m.ProposalsListComponent),
      },
      {
        path: 'ai/proposals/:proposalId',
        loadComponent: () =>
          import('./features/ai/pages/proposal-detail.component').then((m) => m.ProposalDetailComponent),
      },
      {
        path: 'ai/tools',
        loadComponent: () =>
          import('./features/ai/pages/tools-catalog.component').then((m) => m.ToolsCatalogComponent),
      },
      {
        path: 'ai/providers',
        loadComponent: () =>
          import('./features/ai/pages/provider-settings.component').then((m) => m.ProviderSettingsComponent),
      },
      {
        path: 'ai/preferences',
        loadComponent: () =>
          import('./features/ai/pages/workspace-preferences.component').then(
            (m) => m.WorkspacePreferencesComponent
          ),
      },
      {
        path: 'ai/safety',
        loadComponent: () =>
          import('./features/ai/pages/safety-settings.component').then((m) => m.SafetySettingsComponent),
      },
      {
        path: 'creative/assets',
        loadComponent: () =>
          import('./features/creative/pages/assets-list.component').then((m) => m.AssetsListComponent),
      },
      {
        path: 'creative/assets/:assetId',
        loadComponent: () =>
          import('./features/creative/pages/asset-detail.component').then((m) => m.AssetDetailComponent),
      },
      {
        path: 'creative/copy',
        loadComponent: () =>
          import('./features/creative/pages/copy-list.component').then((m) => m.CopyListComponent),
      },
      {
        path: 'creative/copy/:copyId',
        loadComponent: () =>
          import('./features/creative/pages/copy-detail.component').then((m) => m.CopyDetailComponent),
      },
      {
        path: 'creative/variants',
        loadComponent: () =>
          import('./features/creative/pages/variants-list.component').then((m) => m.VariantsListComponent),
      },
      {
        path: 'creative/usage',
        loadComponent: () =>
          import('./features/creative/pages/usage-links.component').then((m) => m.UsageLinksComponent),
      },
      {
        path: 'creative/folders',
        loadComponent: () =>
          import('./features/creative/pages/folders.component').then((m) => m.FoldersComponent),
      },
      {
        path: 'creative/ai',
        loadComponent: () =>
          import('./features/creative/pages/ai-generator.component').then((m) => m.AiGeneratorComponent),
      },
      { path: 'research', redirectTo: 'research/overview', pathMatch: 'full' },
      {
        path: 'research/overview',
        loadComponent: () =>
          import('./features/research/pages/research-overview.component').then((m) => m.ResearchOverviewComponent),
      },
      {
        path: 'research/competitors/:id',
        loadComponent: () =>
          import('./features/research/pages/competitor-detail.component').then((m) => m.CompetitorDetailComponent),
      },
      {
        path: 'research/competitors',
        loadComponent: () =>
          import('./features/research/pages/competitors-list.component').then((m) => m.CompetitorsListComponent),
      },
      {
        path: 'research/sources/:sourceId',
        loadComponent: () =>
          import('./features/research/pages/source-detail.component').then((m) => m.SourceDetailComponent),
      },
      {
        path: 'research/sources',
        loadComponent: () =>
          import('./features/research/pages/sources-list.component').then((m) => m.SourcesListComponent),
      },
      {
        path: 'research/snapshots/:snapshotId',
        loadComponent: () =>
          import('./features/research/pages/snapshot-detail.component').then((m) => m.SnapshotDetailComponent),
      },
      {
        path: 'research/insights/:insightId',
        loadComponent: () =>
          import('./features/research/pages/insight-detail.component').then((m) => m.InsightDetailComponent),
      },
      {
        path: 'research/insights',
        loadComponent: () =>
          import('./features/research/pages/insights-list.component').then((m) => m.InsightsListComponent),
      },
      {
        path: 'research/digests/:id',
        loadComponent: () =>
          import('./features/research/pages/digest-detail.component').then((m) => m.DigestDetailComponent),
      },
      {
        path: 'research/digests',
        loadComponent: () =>
          import('./features/research/pages/digests-list.component').then((m) => m.DigestsListComponent),
      },
      {
        path: 'research/jobs',
        loadComponent: () =>
          import('./features/research/pages/research-jobs.component').then((m) => m.ResearchJobsComponent),
      },
      {
        path: 'research/watchlists',
        loadComponent: () =>
          import('./features/research/pages/watchlists.component').then((m) => m.WatchlistsComponent),
      },
      {
        path: 'research/personas',
        loadComponent: () =>
          import('./features/research/pages/personas.component').then((m) => m.PersonasComponent),
      },
      {
        path: 'research/keyword-clusters',
        loadComponent: () =>
          import('./features/research/pages/keyword-clusters.component').then((m) => m.KeywordClustersComponent),
      },
      {
        path: 'research/links',
        loadComponent: () =>
          import('./features/research/pages/research-links.component').then((m) => m.ResearchLinksComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
