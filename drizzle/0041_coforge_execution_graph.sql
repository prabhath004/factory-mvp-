ALTER TABLE "coforge_mission_tasks" ADD COLUMN "capability" text DEFAULT 'implementation' NOT NULL;--> statement-breakpoint
ALTER TABLE "coforge_mission_tasks" ADD COLUMN "agent_policy" text DEFAULT 'primary' NOT NULL;--> statement-breakpoint
ALTER TABLE "coforge_mission_tasks" ADD COLUMN "depends_on_json" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "coforge_mission_tasks" ADD COLUMN "skills_json" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "coforge_mission_tasks" ADD COLUMN "thread_id" text;--> statement-breakpoint
ALTER TABLE "coforge_mission_tasks" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "coforge_mission_tasks" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "coforge_mission_tasks" ADD CONSTRAINT "coforge_mission_tasks_capability_check" CHECK ("coforge_mission_tasks"."capability" in ('discovery', 'implementation', 'verification', 'delivery'));--> statement-breakpoint
ALTER TABLE "coforge_mission_tasks" ADD CONSTRAINT "coforge_mission_tasks_agent_policy_check" CHECK ("coforge_mission_tasks"."agent_policy" in ('primary', 'specialist', 'independent_reviewer'));
