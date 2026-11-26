import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export interface LinearIssue {
  identifier: string;
  title: string;
  url: string;
  priority: number | null;
  dueDate: string | null;
  updatedAt: string;
  archivedAt: string | null;
  state: { name: string } | null;
  team: { key: string } | null;
  project: { name: string } | null;
}

const QUERY = `query DispatchLinearSync($after: String, $filter: IssueFilter) {
  issues(first: 50, after: $after, filter: $filter, orderBy: updatedAt) {
    nodes { identifier title url priority dueDate updatedAt archivedAt
      state { name } team { key } project { name }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

export function linearIssueFilter(): Record<string, unknown> | undefined {
  const teamId = process.env.LINEAR_TEAM_ID;
  const projectId = process.env.LINEAR_PROJECT_ID;
  if (teamId) return { team: { id: { eq: teamId } } };
  if (projectId) return { project: { id: { eq: projectId } } };
  return undefined;
}

export async function fetchLinearIssues(fetchImpl: typeof fetch = fetch): Promise<LinearIssue[]> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) throw new Error('LINEAR_API_KEY is not configured');
  const issues: LinearIssue[] = [];
  let after: string | null = null;
  do {
    const response = await fetchImpl('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { authorization: apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { after, filter: linearIssueFilter() } }),
    });
    if (!response.ok) throw new Error(`Linear read failed: ${response.status}`);
    const body = await response.json() as { data?: { issues?: { nodes: LinearIssue[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } }; errors?: Array<{ message: string }> };
    if (body.errors?.length) throw new Error(`Linear read failed: ${body.errors[0].message}`);
    const page = body.data?.issues;
    if (!page) throw new Error('Linear read returned no issues page');
    issues.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return issues;
}

export async function syncLinearIssues(issues: LinearIssue[]): Promise<{ written: number; archived: number }> {
  const identifiers = new Set(issues.map((issue) => issue.identifier));
  let archived = 0;
  await prisma.$transaction(async (tx) => {
    for (const issue of issues) {
      await tx.linearIssueSnapshot.upsert({
        where: { identifier: issue.identifier },
        create: {
          identifier: issue.identifier, title: issue.title, url: issue.url,
          priority: issue.priority, dueDate: issue.dueDate ? new Date(issue.dueDate) : null,
          sourceUpdatedAt: new Date(issue.updatedAt), archived: Boolean(issue.archivedAt),
          status: issue.state?.name ?? null, teamKey: issue.team?.key ?? null,
          projectName: issue.project?.name ?? null, payload: issue as unknown as Prisma.InputJsonValue,
        },
        update: {
          title: issue.title, url: issue.url, priority: issue.priority,
          dueDate: issue.dueDate ? new Date(issue.dueDate) : null,
          sourceUpdatedAt: new Date(issue.updatedAt), archived: Boolean(issue.archivedAt),
          status: issue.state?.name ?? null, teamKey: issue.team?.key ?? null,
          projectName: issue.project?.name ?? null, payload: issue as unknown as Prisma.InputJsonValue,
        },
      });
    }
    if (identifiers.size) {
      const result = await tx.linearIssueSnapshot.updateMany({ where: { identifier: { notIn: [...identifiers] }, archived: false }, data: { archived: true } });
      archived = result.count;
    }
  }, { timeout: 120_000 });
  return { written: issues.length, archived };
}
