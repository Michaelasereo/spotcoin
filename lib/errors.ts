export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}
