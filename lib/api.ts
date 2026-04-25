import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

export function success<T>(data: T, meta?: object) {
  return NextResponse.json(meta ? { data, meta } : { data });
}

export function error(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(
      {
        error: err.message,
        code: err.code,
      },
      { status: err.statusCode },
    );
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: err.flatten(),
      },
      { status: 400 },
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return NextResponse.json(
      {
        error: "Database operation failed",
        code: "DATABASE_ERROR",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    },
    { status: 500 },
  );
}
