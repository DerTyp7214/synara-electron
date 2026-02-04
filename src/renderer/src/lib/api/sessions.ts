import { apiCall } from "$lib/api/utils";
import type { UUID } from "node:crypto";

export interface Session {
  id: UUID;
  userAgent: string;
  ipAddress: string;
  lastActive: number;
  isActive: boolean;
}

export async function getSessions(): Promise<Array<Session>> {
  const response = await apiCall<Array<Session>>({
    path: "/sessions",
    method: "GET",
    auth: true,
  });

  return response.getData();
}

export async function deleteSession(sessionId: UUID): Promise<void> {
  await apiCall<void>({
    path: `/sessions/${sessionId}`,
    method: "DELETE",
    auth: true,
  });
}
