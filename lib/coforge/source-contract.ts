import type { MissionPlan, MissionStatus } from "./contracts";
import type { Job, Reply, StageTransition } from "../sources/types";

export type CoforgeReadyMission = {
  id: string;
  key: string;
  goal: string;
  status: MissionStatus;
  repository: string;
  provider: string | null;
  model: string | null;
  acceptanceCriteria: string[];
  plan: MissionPlan;
};

export interface CoforgeStore {
  ready(): Promise<CoforgeReadyMission[]>;
  announceClaim(missionId: string, job: Job<"coforge">): Promise<void>;
  writeBack(missionId: string, job: Job<"coforge">, transition: StageTransition): Promise<boolean>;
  replies(missionId: string): Promise<Reply[]>;
  acknowledgeReplies(missionId: string, replyIds: readonly string[]): Promise<void>;
  cancellation(missionId: string): Promise<boolean>;
  note(missionId: string, key: string, body: string): Promise<void>;
  reopen(missionId: string): Promise<void>;
  requeue(missionId: string, attempt: number): Promise<void>;
  reply(missionId: string, requestId: string, body: string): Promise<void>;
}
