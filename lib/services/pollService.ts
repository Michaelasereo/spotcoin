import type { PollKind, PollResultVisibility, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export type CreatePollInput = {
  kind: PollKind;
  title: string;
  description?: string | null;
  multiSelect: boolean;
  startsAt: Date;
  endsAt: Date;
  resultVisibility: PollResultVisibility;
  votesAnonymous: boolean;
  options: { label: string; optionUserId?: string | null; sortOrder: number }[];
};

export function pollResultsEffectiveVisible(poll: {
  resultVisibility: PollResultVisibility;
  resultsVisible: boolean;
  endsAt: Date;
  closedAt: Date | null;
}): boolean {
  const endMs = new Date(poll.closedAt ?? poll.endsAt).getTime();
  if (poll.resultVisibility === "AUTO_AFTER_END") {
    return Date.now() >= endMs;
  }
  return poll.resultsVisible;
}

function votingWindowOpen(poll: { startsAt: Date; endsAt: Date }): boolean {
  const now = Date.now();
  return now >= new Date(poll.startsAt).getTime() && now < new Date(poll.endsAt).getTime();
}

async function assertCreatorOrAdmin(actorId: string, actorRole: Role, createdById: string) {
  if (createdById === actorId) return;
  if (actorRole === "ADMIN") return;
  throw new AppError("Only the creator or an admin can perform this action", "FORBIDDEN", 403);
}

async function getPollInWorkspace(pollId: string, workspaceId: string) {
  const poll = await prisma.poll.findFirst({
    where: { id: pollId, workspaceId },
    include: {
      options: {
        orderBy: { sortOrder: "asc" },
        include: { optionUser: { select: { id: true, name: true, avatarUrl: true } } },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!poll) {
    throw new AppError("Poll not found", "POLL_NOT_FOUND", 404);
  }
  return poll;
}

function mapPollToDto(
  poll: Awaited<ReturnType<typeof getPollInWorkspace>> & {
    options: Array<{
      id: string;
      label: string;
      optionUserId: string | null;
      sortOrder: number;
      optionUser: { id: string; name: string; avatarUrl: string | null } | null;
      _count?: { votes: number };
    }>;
    votes?: { optionId: string }[];
  },
  viewerId?: string,
) {
  const effectiveVisible = pollResultsEffectiveVisible(poll);
  const open = votingWindowOpen(poll);
  const viewerOptionIds = poll.votes?.map((v) => v.optionId) ?? [];

  return {
    id: poll.id,
    workspaceId: poll.workspaceId,
    kind: poll.kind,
    title: poll.title,
    description: poll.description,
    multiSelect: poll.multiSelect,
    startsAt: poll.startsAt.toISOString(),
    endsAt: poll.endsAt.toISOString(),
    closedAt: poll.closedAt?.toISOString() ?? null,
    resultVisibility: poll.resultVisibility,
    resultsVisible: poll.resultsVisible,
    votesAnonymous: poll.votesAnonymous,
    resultsEffectiveVisible: effectiveVisible,
    votingOpen: open,
    createdBy: poll.createdBy,
    createdAt: poll.createdAt.toISOString(),
    options: poll.options.map((o) => {
      const withCount = o as typeof o & { _count?: { votes: number } };
      return {
        id: o.id,
        label: o.label,
        optionUserId: o.optionUserId,
        optionUser: o.optionUser,
        sortOrder: o.sortOrder,
        voteCount: withCount._count?.votes ?? 0,
      };
    }),
    viewerOptionIds,
  };
}

export const pollService = {
  async create(creatorId: string, workspaceId: string, input: CreatePollInput) {
    if (input.endsAt <= input.startsAt) {
      throw new AppError("End time must be after start time", "INVALID_TIMELINE", 400);
    }
    if (input.options.length < 2 || input.options.length > 10) {
      throw new AppError("Polls need between 2 and 10 options", "INVALID_OPTIONS", 400);
    }

    if (input.kind === "AWARD") {
      for (const opt of input.options) {
        if (!opt.optionUserId) {
          throw new AppError("Award options must reference a team member", "AWARD_OPTION_USER", 400);
        }
        const u = await prisma.user.findFirst({
          where: { id: opt.optionUserId, workspaceId, deletedAt: null },
          select: { id: true, name: true },
        });
        if (!u) {
          throw new AppError("Invalid nominee for this workspace", "OPTION_USER_INVALID", 400);
        }
      }
    } else {
      for (const opt of input.options) {
        if (!opt.label.trim()) {
          throw new AppError("Each poll option needs a label", "INVALID_OPTION_LABEL", 400);
        }
      }
    }

    const poll = await prisma.$transaction(async (tx) => {
      const created = await tx.poll.create({
        data: {
          workspaceId,
          createdById: creatorId,
          kind: input.kind,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          multiSelect: input.multiSelect,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          resultVisibility: input.resultVisibility,
          votesAnonymous: input.votesAnonymous,
        },
      });

      await tx.pollOption.createMany({
        data: input.options.map((o) => ({
          pollId: created.id,
          label: o.label.trim() || "Option",
          optionUserId: o.optionUserId ?? null,
          sortOrder: o.sortOrder,
        })),
      });

      return tx.poll.findFirstOrThrow({
        where: { id: created.id },
        include: {
          options: {
            orderBy: { sortOrder: "asc" },
            include: {
              optionUser: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
          createdBy: { select: { id: true, name: true } },
        },
      });
    });

    const withCounts = await this.enrichWithCounts(poll, creatorId);
    return mapPollToDto(withCounts, creatorId);
  },

  async enrichWithCounts(
    poll: Awaited<ReturnType<typeof getPollInWorkspace>>,
    viewerId?: string,
  ) {
    const optionIds = poll.options.map((o) => o.id);
    const counts =
      optionIds.length === 0
        ? []
        : await prisma.pollVote.groupBy({
            by: ["optionId"],
            where: { optionId: { in: optionIds } },
            _count: { _all: true },
          });

    const countMap = new Map(counts.map((c) => [c.optionId, c._count._all]));

    const viewerVotes = viewerId
      ? await prisma.pollVote.findMany({
          where: { pollId: poll.id, userId: viewerId },
          select: { optionId: true },
        })
      : [];

    return {
      ...poll,
      options: poll.options.map((o) => ({
        ...o,
        _count: { votes: countMap.get(o.id) ?? 0 },
      })),
      votes: viewerVotes,
    };
  },

  async list(workspaceId: string, filter: "open" | "ended" | "all", viewerId: string) {
    const now = new Date();

    const where: Prisma.PollWhereInput = { workspaceId };

    if (filter === "open") {
      where.startsAt = { lte: now };
      where.endsAt = { gt: now };
    } else if (filter === "ended") {
      where.endsAt = { lte: now };
    }

    const polls = await prisma.poll.findMany({
      where,
      orderBy: { endsAt: "desc" },
      include: {
        options: {
          orderBy: { sortOrder: "asc" },
          include: {
            optionUser: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });

    const out = [];
    for (const p of polls) {
      const enriched = await this.enrichWithCounts(p, viewerId);
      out.push(mapPollToDto(enriched, viewerId));
    }
    return out;
  },

  async getById(workspaceId: string, pollId: string, viewerId: string) {
    const poll = await getPollInWorkspace(pollId, workspaceId);
    const enriched = await this.enrichWithCounts(poll, viewerId);
    return mapPollToDto(enriched, viewerId);
  },

  async castVote(pollId: string, workspaceId: string, userId: string, optionIds: string[]) {
    const poll = await getPollInWorkspace(pollId, workspaceId);

    const voter = await prisma.user.findFirst({
      where: { id: userId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!voter) {
      throw new AppError("Cannot vote with this account", "VOTER_INVALID", 403);
    }

    if (!votingWindowOpen(poll)) {
      throw new AppError("This poll is not open for voting", "POLL_CLOSED", 400);
    }

    if (!poll.multiSelect && optionIds.length !== 1) {
      throw new AppError("Select exactly one option", "SINGLE_VOTE_REQUIRED", 400);
    }
    if (poll.multiSelect && optionIds.length < 1) {
      throw new AppError("Select at least one option", "MULTI_VOTE_REQUIRED", 400);
    }

    const unique = Array.from(new Set(optionIds));
    const validOptions = await prisma.pollOption.findMany({
      where: { pollId, id: { in: unique } },
      select: { id: true },
    });
    if (validOptions.length !== unique.length) {
      throw new AppError("One or more options are invalid", "INVALID_OPTIONS", 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.pollVote.deleteMany({ where: { pollId, userId } });
      if (unique.length > 0) {
        await tx.pollVote.createMany({
          data: unique.map((optionId) => ({
            pollId,
            optionId,
            userId,
          })),
          skipDuplicates: true,
        });
      }
    });

    return this.getById(workspaceId, pollId, userId);
  },

  async closeNow(pollId: string, workspaceId: string, actorId: string, actorRole: Role) {
    const poll = await getPollInWorkspace(pollId, workspaceId);
    await assertCreatorOrAdmin(actorId, actorRole, poll.createdById);

    const now = new Date();
    await prisma.poll.update({
      where: { id: pollId },
      data: { closedAt: now, endsAt: now },
    });

    return this.getById(workspaceId, pollId, actorId);
  },

  async toggleResultsVisible(
    pollId: string,
    workspaceId: string,
    actorId: string,
    actorRole: Role,
    value: boolean,
  ) {
    const poll = await getPollInWorkspace(pollId, workspaceId);
    await assertCreatorOrAdmin(actorId, actorRole, poll.createdById);

    if (poll.resultVisibility !== "MANUAL") {
      throw new AppError("Results visibility can only be toggled for manual polls", "NOT_MANUAL_POLL", 400);
    }

    await prisma.poll.update({
      where: { id: pollId },
      data: { resultsVisible: value },
    });

    return this.getById(workspaceId, pollId, actorId);
  },

  async delete(pollId: string, workspaceId: string, actorId: string, actorRole: Role) {
    const poll = await getPollInWorkspace(pollId, workspaceId);
    await assertCreatorOrAdmin(actorId, actorRole, poll.createdById);

    await prisma.poll.delete({ where: { id: pollId } });
  },
};
