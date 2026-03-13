import { NextRequest, NextResponse } from 'next/server';
import { ContentStage, Project } from '@prisma/client';
import { prisma } from '@/lib/db';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/content/summary — Aggregate counts by stage (flat object)
// ─────────────────────────────────────────────────────────────────────────────

async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const projectParam = searchParams.get('project');

    // Validate project if provided
    let projectFilter: Project | undefined;
    if (projectParam) {
      const validProjects = Object.values(Project);
      if (validProjects.includes(projectParam as Project)) {
        projectFilter = projectParam as Project;
      }
    }

    // Aggregate counts using groupBy (single query)
    const allStages = Object.values(ContentStage);
    const grouped = await prisma.contentItem.groupBy({
      by: ['stage'],
      _count: { stage: true },
      ...(projectFilter && { where: { project: projectFilter } }),
    });

    // Build flat object with all stages (0 if no rows)
    const summaryObj: Record<string, number> = {};
    for (const stage of allStages) {
      summaryObj[stage] = 0;
    }
    for (const row of grouped) {
      summaryObj[row.stage] = row._count.stage;
    }

    return NextResponse.json(summaryObj, { status: 200 });
  } catch (error) {
    console.error('Content summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export { GET };
