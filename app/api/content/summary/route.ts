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

    // Get counts for each stage
    const stages = Object.values(ContentStage);
    const summaryObj: Record<string, number> = {};

    for (const stage of stages) {
      const count = await prisma.contentItem.count({
        where: {
          stage,
          ...(projectFilter && { project: projectFilter }),
        },
      });
      summaryObj[stage] = count;
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
