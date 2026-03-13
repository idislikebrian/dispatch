import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ContentPlatform, ContentStage, Project } from '@prisma/client';
import { prisma } from '@/lib/db';

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/content/[id] — Update a content item
// ─────────────────────────────────────────────────────────────────────────────

interface UpdateContentRequestBody {
  title?: string;
  project?: string;
  stage?: string;
  summary?: string;
  scheduledFor?: string;
  publishedAt?: string;
  ownerName?: string;
  platform?: string;
  relatedEventId?: string;
  sourceIdea?: string;
  ownerType?: string;
}

async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body: UpdateContentRequestBody = await request.json();

    // Fetch existing item
    const existingItem = await prisma.contentItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Content item not found' },
        { status: 404 }
      );
    }

    // Check for attempts to update immutable fields
    const immutableFields = ['id', 'createdAt'];
    for (const field of immutableFields) {
      if (field in body) {
        return NextResponse.json(
          { error: `Cannot update immutable field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Check for disallowed fields
    const disallowedFields = ['sourceIdea', 'ownerType', 'relatedEventId'];
    for (const field of disallowedFields) {
      if (field in body) {
        return NextResponse.json(
          { error: `Cannot update field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Build update data with validation
    const updateData: Prisma.ContentItemUpdateInput = {};

    if ('title' in body && body.title !== undefined) {
      updateData.title = body.title;
    }

    if ('project' in body && body.project !== undefined) {
      const validProjects = Object.values(Project);
      if (!validProjects.includes(body.project as Project)) {
        return NextResponse.json(
          { error: `Invalid project. Must be one of: ${validProjects.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.project = body.project as Project;
    }

    if ('stage' in body && body.stage !== undefined) {
      const validStages = Object.values(ContentStage);
      if (!validStages.includes(body.stage as ContentStage)) {
        return NextResponse.json(
          { error: `Invalid stage. Must be one of: ${validStages.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.stage = body.stage as ContentStage;
    }

    if ('summary' in body && body.summary !== undefined) {
      updateData.summary = body.summary || null;
    }

    if ('platform' in body && body.platform !== undefined) {
      const validPlatforms = Object.values(ContentPlatform);
      if (!validPlatforms.includes(body.platform as ContentPlatform)) {
        return NextResponse.json(
          { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.platform = body.platform as ContentPlatform;
    }

    if ('scheduledFor' in body && body.scheduledFor !== undefined) {
      updateData.scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
    }

    if ('publishedAt' in body && body.publishedAt !== undefined) {
      updateData.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
    }

    if ('ownerName' in body && body.ownerName !== undefined) {
      updateData.ownerName = body.ownerName;
    }

    // Perform update
    const updatedItem = await prisma.contentItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    console.error('Content update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export { PATCH };
