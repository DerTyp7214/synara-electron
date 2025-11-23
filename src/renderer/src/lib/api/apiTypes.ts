import { debugLog } from "$lib/logger";

export class ApiResponse<T> {
  private readonly status: number;
  private readonly response: Response;

  private data?: T;
  private rawText?: string;

  constructor(response: Response) {
    this.response = response;
    this.status = response.status;
  }

  async getData(): Promise<T> {
    if (!this.data) this.data = JSON.parse(await this.getRawText());

    debugLog("info", this.data);

    return this.data!;
  }

  async getRawText(): Promise<string> {
    if (!this.rawText) this.rawText = await this.response.text();

    return this.rawText!;
  }

  isOk(): boolean {
    return this.response.ok;
  }

  getStatus(): number {
    return this.status;
  }
}

export interface TokenResponse {
  token: string;
  refreshToken: string;
  expiresAt: number;
}

export interface PagedResponse<T> {
  data: Array<T>;
  hasNextPage: boolean;
  page: number;
  pageSize: number;
}
