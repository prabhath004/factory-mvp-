import "./test-guard";
import assert from "node:assert/strict";
import { COMPOSIO_TOOLKITS, composioReadiness } from "../lib/integrations/composio";

const previous = process.env.COMPOSIO_API_KEY;
delete process.env.COMPOSIO_API_KEY;
assert.equal(composioReadiness().configured, false);
process.env.COMPOSIO_API_KEY = "test-only-key";
assert.equal(composioReadiness().configured, true);
assert.deepEqual(Object.keys(COMPOSIO_TOOLKITS), ["slack", "jira", "notion"]);
assert.deepEqual(COMPOSIO_TOOLKITS.slack.tools, ["SLACK_SEND_MESSAGE"], "Slack receives one explicit write capability");
assert.deepEqual(COMPOSIO_TOOLKITS.jira.tools, ["JIRA_GET_ISSUE"], "Jira is read-only by policy");
assert.deepEqual(COMPOSIO_TOOLKITS.notion.tools, ["NOTION_FETCH_DATA"], "Notion is read-only by policy");
if (previous === undefined) delete process.env.COMPOSIO_API_KEY;
else process.env.COMPOSIO_API_KEY = previous;

console.log("Composio policy regressions passed");
