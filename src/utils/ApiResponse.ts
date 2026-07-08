export class ApiResponse {
  public static success<T>(data: T, message?: string) {
    return { success: true as const, data, message };
  }
}
