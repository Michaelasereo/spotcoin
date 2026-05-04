import type { Role, RsvpStatus } from "@prisma/client";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export type CreateEventInput = {
  title: string;
  description?: string | null;
  location?: string | null;
  venue?: string | null;
  coverImageUrl?: string | null;
  linkUrl?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
};

export type UpdateEventInput = Partial<CreateEventInput>;

function optionalDescription(input: string | null | undefined) {
  if (input == null || input === "") return null;
  const cleaned = sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();
  return cleaned.length > 0 ? cleaned : null;
}

async function assertCreatorOrAdmin(actorId: string, actorRole: Role, createdById: string) {
  if (createdById === actorId) return;
  if (actorRole === "ADMIN") return;
  throw new AppError("Only the creator or an admin can perform this action", "FORBIDDEN", 403);
}

async function getEventInWorkspace(eventId: string, workspaceId: string) {
  const ev = await prisma.workspaceEvent.findFirst({
    where: { id: eventId, workspaceId },
    include: {
      createdBy: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
  if (!ev) {
    throw new AppError("Event not found", "EVENT_NOT_FOUND", 404);
  }
  return ev;
}

export const eventService = {
  async create(creatorId: string, workspaceId: string, input: CreateEventInput) {
    const title = input.title.trim();
    if (!title) {
      throw new AppError("Title is required", "VALIDATION_ERROR", 400);
    }
    if (input.endsAt && input.endsAt <= input.startsAt) {
      throw new AppError("End time must be after start time", "INVALID_TIMELINE", 400);
    }

    const description = optionalDescription(input.description);

    return prisma.workspaceEvent.create({
      data: {
        workspaceId,
        createdById: creatorId,
        title,
        description,
        location: input.location?.trim() || null,
        venue: input.venue?.trim() || null,
        coverImageUrl: input.coverImageUrl?.trim() || null,
        linkUrl: input.linkUrl?.trim() || null,
        startsAt: input.startsAt,
        endsAt: input.endsAt ?? null,
      },
      include: { createdBy: { select: { id: true, name: true, avatarUrl: true } } },
    });
  },

  async list(workspaceId: string, when: "upcoming" | "past") {
    const now = new Date();
    const where =
      when === "upcoming"
        ? { workspaceId, startsAt: { gte: now } }
        : { workspaceId, startsAt: { lt: now } };

    return prisma.workspaceEvent.findMany({
      where,
      orderBy: { startsAt: when === "upcoming" ? "asc" : "desc" },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { rsvps: true, comments: true } },
      },
    });
  },

  async get(eventId: string, workspaceId: string, viewerId?: string) {
    const ev = await getEventInWorkspace(eventId, workspaceId);

    const [going, interested, notGoing, viewerRsvp] = await Promise.all([
      prisma.eventRsvp.count({ where: { eventId, status: "GOING" } }),
      prisma.eventRsvp.count({ where: { eventId, status: "INTERESTED" } }),
      prisma.eventRsvp.count({ where: { eventId, status: "NOT_GOING" } }),
      viewerId
        ? prisma.eventRsvp.findUnique({
            where: { eventId_userId: { eventId, userId: viewerId } },
            select: { status: true },
          })
        : Promise.resolve(null),
    ]);

    return {
      ...ev,
      rsvpCounts: { going, interested, notGoing },
      viewerRsvp: viewerRsvp?.status ?? null,
    };
  },

  async update(eventId: string, workspaceId: string, actorId: string, actorRole: Role, patch: UpdateEventInput) {
    const ev = await getEventInWorkspace(eventId, workspaceId);
    await assertCreatorOrAdmin(actorId, actorRole, ev.createdById);

    const nextStart = patch.startsAt ?? ev.startsAt;
    if (patch.endsAt && patch.endsAt <= nextStart) {
      throw new AppError("End time must be after start time", "INVALID_TIMELINE", 400);
    }

    const data: Parameters<typeof prisma.workspaceEvent.update>[0]["data"] = {};
    if (patch.title !== undefined) data.title = patch.title.trim();
    if (patch.description !== undefined) {
      data.description = optionalDescription(patch.description);
    }
    if (patch.location !== undefined) data.location = patch.location?.trim() || null;
    if (patch.venue !== undefined) data.venue = patch.venue?.trim() || null;
    if (patch.coverImageUrl !== undefined) data.coverImageUrl = patch.coverImageUrl?.trim() || null;
    if (patch.linkUrl !== undefined) data.linkUrl = patch.linkUrl?.trim() || null;
    if (patch.startsAt !== undefined) data.startsAt = patch.startsAt;
    if (patch.endsAt !== undefined) data.endsAt = patch.endsAt;

    if (Object.keys(data).length === 0) {
      return prisma.workspaceEvent.findFirstOrThrow({
        where: { id: eventId },
        include: { createdBy: { select: { id: true, name: true, avatarUrl: true } } },
      });
    }

    return prisma.workspaceEvent.update({
      where: { id: eventId },
      data,
      include: { createdBy: { select: { id: true, name: true, avatarUrl: true } } },
    });
  },

  async deleteEvent(eventId: string, workspaceId: string, actorId: string, actorRole: Role) {
    const ev = await getEventInWorkspace(eventId, workspaceId);
    await assertCreatorOrAdmin(actorId, actorRole, ev.createdById);
    await prisma.workspaceEvent.delete({ where: { id: eventId } });
  },

  async setRsvp(eventId: string, workspaceId: string, userId: string, status: RsvpStatus) {
    await getEventInWorkspace(eventId, workspaceId);

    const member = await prisma.user.findFirst({
      where: { id: userId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!member) {
      throw new AppError("Cannot RSVP with this account", "RSVP_FORBIDDEN", 403);
    }

    return prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status },
      update: { status },
    });
  },

  async listComments(eventId: string, workspaceId: string) {
    await getEventInWorkspace(eventId, workspaceId);

    return prisma.eventComment.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
  },

  async addComment(eventId: string, workspaceId: string, userId: string, message: string) {
    await getEventInWorkspace(eventId, workspaceId);

    const member = await prisma.user.findFirst({
      where: { id: userId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!member) {
      throw new AppError("Cannot comment with this account", "COMMENT_FORBIDDEN", 403);
    }

    const cleaned = sanitizeHtml(message, { allowedTags: [], allowedAttributes: {} }).trim();
    if (cleaned.length < 1) {
      throw new AppError("Comment cannot be empty", "INVALID_COMMENT", 400);
    }

    return prisma.eventComment.create({
      data: { eventId, userId, message: cleaned },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
  },
};
