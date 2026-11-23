CREATE TABLE "integration_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"provider" text NOT NULL,
	"toolkit" text NOT NULL,
	"connection_ref" text NOT NULL,
	"status" text NOT NULL,
	"scopes_metadata" jsonb DEFAULT '{"tools":[]}'::jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "integration_connections_provider_check" CHECK ("integration_connections"."provider" in ('composio'))
);--> statement-breakpoint
CREATE UNIQUE INDEX "integration_connections_owner_ref_idx" ON "integration_connections" USING btree ("owner_id","provider","connection_ref");--> statement-breakpoint
CREATE INDEX "integration_connections_owner_toolkit_idx" ON "integration_connections" USING btree ("owner_id","toolkit");
