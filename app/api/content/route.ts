import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ContentPlatform, ContentStage, OwnerType, Project } from '@prisma/client';
import { prisma } from '@/lib/db';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/content — Create a content item
// ─────────────────────────────────────────────────────────────────────────────

interface CreateContentRequestBody {
  title: string;
  project: string;
  platform: string;
  stage: string;
  ownerName: string;
  ownerType: string;
  summary?: string;
  sourceIdea?: string;
  relatedEventId?: string;
  scheduledFor?: string;
  publishedAt?: string;
}

function isValidEnum<T extends Record<string, unknown>>(
  value: string,
  enumObj: T
): boolean {
  return Object.values(enumObj).includes(value as T[keyof T]);
}

async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: CreateContentRequestBody = await request.json();
    const {
      title,
      project,
      platform,
      stage,
      ownerName,
      ownerType,
      summary,
      sourceIdea,
      relatedEventId,
      scheduledFor,
      publishedAt,
    } = body;

    // Validate required fields
    if (!title || !project || !platform || !stage || !ownerName || !ownerType) {
      return NextResponse.json(
        {
          error: 'Missing required fields: title, project, platform, stage, ownerName, ownerType',
        },
        { status: 400 }
      );
    }

    // Validate enum values
    const validProjects = Object.values(Project);
    const validPlatforms = Object.values(ContentPlatform);
    const validStages = Object.values(ContentStage);
    const validOwnerTypes = Object.values(OwnerType);

    if (!validProjects.includes(project as Project)) {
      return NextResponse.json(
        { error: `Invalid project. Must be one of: ${validProjects.join(', ')}` },
        { status: 400 }
      );
    }

    if (!validPlatforms.includes(platform as ContentPlatform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    if (!validStages.includes(stage as ContentStage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${validStages.join(', ')}` },
        { status: 400 }
      );
    }

    if (!validOwnerTypes.includes(ownerType as OwnerType)) {
      return NextResponse.json(
        { error: `Invalid ownerType. Must be one of: ${validOwnerTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // If relatedEventId is provided, verify the AgentEvent exists
    if (relatedEventId) {
      const event = await prisma.agentEvent.findUnique({
        where: { id: relatedEventId },
      });

      if (!event) {
        return NextResponse.json(
          { error: 'Related event not found' },
          { status: 404 }
        );
      }
    }

    // Create the content item
    const contentItem = await prisma.contentItem.create({
      data: {
        title,
        project: project as Project,
        platform: platform as ContentPlatform,
        stage: stage as ContentStage,
        ownerName,
        ownerType: ownerType as OwnerType,
        summary: summary || null,
        sourceIdea: sourceIdea || null,
        relatedEventId: relatedEventId || null,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
      },
    });

    return NextResponse.json(contentItem, { status: 201 });
  } catch (error) {
    console.error('Content creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/content — List content items with filters (simple array response)
// ─────────────────────────────────────────────────────────────────────────────

async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const stageParam = searchParams.get('stage');
    const platformParam = searchParams.get('platform');
    const projectParam = searchParams.get('project');
    const limitParam = searchParams.get('limit');

    // Parse limit (default 50)
    let limit = Math.min(1000, Math.max(1, parseInt(limitParam || '50', 10)));
    if (Number.isNaN(limit)) limit = 50;

    // Build where clause
    const where: Prisma.ContentItemWhereInput = {};

    // Filter by stage
    if (stageParam) {
      const validStages = Object.values(ContentStage);
      if (validStages.includes(stageParam as ContentStage)) {
        where.stage = stageParam as ContentStage;
      }
    }

    // Filter by platform
    if (platformParam) {
      const validPlatforms = Object.values(ContentPlatform);
      if (validPlatforms.includes(platformParam as ContentPlatform)) {
        where.platform = platformParam as ContentPlatform;
      }
    }

    // Filter by project
    if (projectParam) {
      const validProjects = Object.values(Project);
      if (validProjects.includes(projectParam as Project)) {
        where.project = projectParam as Project;
      }
    }

    // Always sort by createdAt DESC
    const contentItems = await prisma.contentItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(contentItems, { status: 200 });
  } catch (error) {
    console.error('Content fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export { POST, GET };
