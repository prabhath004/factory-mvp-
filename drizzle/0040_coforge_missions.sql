CREATE SEQUENCE IF NOT EXISTS "coforge_mission_key_seq" START WITH 100;--> statement-breakpoint
CREATE TABLE "coforge_mission_events" (
	"id" text PRIMARY KEY NOT NULL,
	"mission_id" text NOT NULL,
	"run_id" text,
	"event_key" text NOT NULL,
	"kind" text NOT NULL,
	"stage" text,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "coforge_mission_events_event_key_unique" UNIQUE("event_key")
);
--> statement-breakpoint
CREATE TABLE "coforge_mission_replies" (
	"id" text PRIMARY KEY NOT NULL,
	"mission_id" text NOT NULL,
	"request_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"acknowledged_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "coforge_mission_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"mission_id" text NOT NULL,
	"upstream_job_id" text NOT NULL,
	"attempt" integer NOT NULL,
	"branch_name" text NOT NULL,
	"worktree_ref" text,
	"provider" text,
	"model" text,
	"status" text NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"final_commit_sha" text,
	"pr_number" integer,
	"pr_url" text,
	"failure_reason" text
);
--> statement-breakpoint
CREATE TABLE "coforge_mission_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"mission_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"acceptance_criteria_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"evidence_json" jsonb,
	CONSTRAINT "coforge_mission_tasks_ordinal_check" CHECK ("coforge_mission_tasks"."ordinal" between 1 and 5),
	CONSTRAINT "coforge_mission_tasks_status_check" CHECK ("coforge_mission_tasks"."status" in ('pending', 'active', 'done', 'blocked', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "coforge_missions" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text DEFAULT 'COF-' || nextval('coforge_mission_key_seq')::text NOT NULL,
	"project_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"goal" text NOT NULL,
	"mode" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"plan_version" integer DEFAULT 0 NOT NULL,
	"plan_json" jsonb,
	"acceptance_criteria_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selected_provider" text,
	"selected_model" text,
	"budget_warning_usd" double precision,
	"approved_at" timestamp with time zone,
	"approved_plan_version" integer,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"cancel_requested_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "coforge_missions_key_unique" UNIQUE("key"),
	CONSTRAINT "coforge_missions_mode_check" CHECK ("coforge_missions"."mode" in ('greenfield', 'brownfield')),
	CONSTRAINT "coforge_missions_status_check" CHECK ("coforge_missions"."status" in ('draft', 'planning', 'awaiting_approval', 'queued', 'running', 'waiting_for_user', 'verifying', 'pr_open', 'reviewing', 'merge_ready', 'needs_changes', 'completed', 'merged', 'failed', 'cancelled')),
	CONSTRAINT "coforge_missions_plan_version_check" CHECK ("coforge_missions"."plan_version" >= 0),
	CONSTRAINT "coforge_missions_approval_check" CHECK (("coforge_missions"."approved_at" is null and "coforge_missions"."approved_plan_version" is null) or ("coforge_missions"."approved_at" is not null and "coforge_missions"."approved_plan_version" = "coforge_missions"."plan_version"))
);
--> statement-breakpoint
CREATE TABLE "coforge_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"mode" text NOT NULL,
	"repo_url" text NOT NULL,
	"repo_default_branch" text DEFAULT 'main' NOT NULL,
	"local_repo_path" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "coforge_projects_mode_check" CHECK ("coforge_projects"."mode" in ('greenfield', 'brownfield'))
);
--> statement-breakpoint
ALTER TABLE "coforge_mission_events" ADD CONSTRAINT "coforge_mission_events_mission_id_coforge_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."coforge_missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coforge_mission_events" ADD CONSTRAINT "coforge_mission_events_run_id_coforge_mission_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."coforge_mission_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coforge_mission_replies" ADD CONSTRAINT "coforge_mission_replies_mission_id_coforge_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."coforge_missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coforge_mission_runs" ADD CONSTRAINT "coforge_mission_runs_mission_id_coforge_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."coforge_missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coforge_mission_tasks" ADD CONSTRAINT "coforge_mission_tasks_mission_id_coforge_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."coforge_missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coforge_missions" ADD CONSTRAINT "coforge_missions_project_id_coforge_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."coforge_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coforge_mission_events_mission_at_idx" ON "coforge_mission_events" USING btree ("mission_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "coforge_mission_replies_request_idx" ON "coforge_mission_replies" USING btree ("mission_id","request_id");--> statement-breakpoint
CREATE INDEX "coforge_mission_replies_pending_idx" ON "coforge_mission_replies" USING btree ("mission_id","acknowledged_at");--> statement-breakpoint
CREATE UNIQUE INDEX "coforge_mission_runs_attempt_idx" ON "coforge_mission_runs" USING btree ("mission_id","attempt");--> statement-breakpoint
CREATE INDEX "coforge_mission_runs_job_idx" ON "coforge_mission_runs" USING btree ("upstream_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coforge_mission_tasks_ordinal_idx" ON "coforge_mission_tasks" USING btree ("mission_id","ordinal");--> statement-breakpoint
CREATE UNIQUE INDEX "coforge_missions_owner_idempotency_idx" ON "coforge_missions" USING btree ("owner_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "coforge_missions_owner_updated_idx" ON "coforge_missions" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE INDEX "coforge_missions_project_updated_idx" ON "coforge_missions" USING btree ("project_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "coforge_projects_owner_slug_idx" ON "coforge_projects" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "coforge_projects_owner_repo_idx" ON "coforge_projects" USING btree ("owner_id","repo_url");
