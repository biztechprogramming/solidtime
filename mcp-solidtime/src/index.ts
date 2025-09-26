#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SolidtimeClient } from "./solidtime-client.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Validate environment variables
const SOLIDTIME_BASE_URL = process.env.SOLIDTIME_BASE_URL || 'http://localhost';
const SOLIDTIME_API_TOKEN = process.env.SOLIDTIME_API_TOKEN;
const SOLIDTIME_ORGANIZATION_ID = process.env.SOLIDTIME_ORGANIZATION_ID;
const SOLIDTIME_DEFAULT_MEMBER_ID = process.env.SOLIDTIME_DEFAULT_MEMBER_ID;

if (!SOLIDTIME_API_TOKEN) {
  console.error('Error: SOLIDTIME_API_TOKEN environment variable is required');
  process.exit(1);
}

if (!SOLIDTIME_ORGANIZATION_ID) {
  console.error('Error: SOLIDTIME_ORGANIZATION_ID environment variable is required');
  process.exit(1);
}

// Initialize Solidtime client
const solidtime = new SolidtimeClient(
  SOLIDTIME_BASE_URL,
  SOLIDTIME_API_TOKEN,
  SOLIDTIME_ORGANIZATION_ID
);

// Create MCP server
const server = new McpServer({
  name: "solidtime-mcp",
  version: "1.0.0"
});

// Register Time Entry Tools
server.registerTool(
  "start-timer",
  {
    title: "Start Time Tracking",
    description: "Start tracking time for a project or task",
    inputSchema: {
      description: z.string().optional().describe("Description of the work being done"),
      project_id: z.string().optional().describe("ID of the project to track time for"),
      task_id: z.string().optional().describe("ID of the task to track time for"),
      tags: z.array(z.string()).optional().describe("Tags to apply to the time entry"),
      billable: z.boolean().optional().default(false).describe("Whether this time is billable"),
      member_id: z.string().optional().describe("Member ID (uses default if not provided)")
    }
  },
  async (args) => {
    try {
      const memberId = args.member_id || SOLIDTIME_DEFAULT_MEMBER_ID;
      if (!memberId) {
        throw new Error("member_id is required or SOLIDTIME_DEFAULT_MEMBER_ID must be set");
      }

      // Stop any active time entry first
      await solidtime.stopActiveTimeEntry(memberId);

      const timeEntry = await solidtime.createTimeEntry({
        description: args.description,
        start: new Date().toISOString(),
        project_id: args.project_id,
        task_id: args.task_id,
        tags: args.tags,
        billable: args.billable,
        member_id: memberId
      });

      return {
        content: [{
          type: "text",
          text: `Started tracking time. Entry ID: ${timeEntry.id}`
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error starting timer: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

server.registerTool(
  "stop-timer",
  {
    title: "Stop Time Tracking",
    description: "Stop the currently active time tracking",
    inputSchema: {
      member_id: z.string().optional().describe("Member ID (uses default if not provided)")
    }
  },
  async (args) => {
    try {
      const memberId = args.member_id || SOLIDTIME_DEFAULT_MEMBER_ID;
      if (!memberId) {
        throw new Error("member_id is required or SOLIDTIME_DEFAULT_MEMBER_ID must be set");
      }

      const stoppedEntry = await solidtime.stopActiveTimeEntry(memberId);

      if (stoppedEntry) {
        return {
          content: [{
            type: "text",
            text: `Stopped tracking time. Entry ID: ${stoppedEntry.id}`
          }]
        };
      } else {
        return {
          content: [{
            type: "text",
            text: "No active time entry found to stop"
          }]
        };
      }
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error stopping timer: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

server.registerTool(
  "add-time-entry",
  {
    title: "Add Time Entry",
    description: "Add a completed time entry with specific start and end times",
    inputSchema: {
      description: z.string().optional().describe("Description of the work done"),
      start: z.string().describe("Start time in ISO 8601 format"),
      end: z.string().describe("End time in ISO 8601 format"),
      project_id: z.string().optional().describe("ID of the project"),
      task_id: z.string().optional().describe("ID of the task"),
      tags: z.array(z.string()).optional().describe("Tags to apply"),
      billable: z.boolean().default(false).describe("Whether this time is billable"),
      member_id: z.string().describe("Member ID (required - use list-members to find valid IDs)")
    }
  },
  async (args) => {
    try {
      if (!args.member_id) {
        throw new Error("member_id is required. Use list-members to find valid member IDs.");
      }

      // Ensure date format matches API requirements (Y-m-d\TH:i:s\Z)
      const formatDate = (dateStr: string) => {
        if (!dateStr.endsWith('Z')) {
          // If no Z, assume it's local time and convert to UTC
          const date = new Date(dateStr);
          return date.toISOString().replace('.000Z', 'Z');
        }
        return dateStr.replace(/\.\d{3}Z$/, 'Z'); // Remove milliseconds if present
      };

      const timeEntry = await solidtime.createTimeEntry({
        description: args.description,
        start: formatDate(args.start),
        end: args.end ? formatDate(args.end) : undefined,
        project_id: args.project_id,
        task_id: args.task_id,
        tags: args.tags,
        billable: args.billable,
        member_id: args.member_id
      });

      return {
        content: [{
          type: "text",
          text: `Added time entry: ${timeEntry.id} (${args.start} to ${args.end})`
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error adding time entry: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

server.registerTool(
  "list-time-entries",
  {
    title: "List Time Entries",
    description: "List recent time entries with optional filters",
    inputSchema: {
      member_id: z.string().optional().describe("Filter by member ID"),
      project_id: z.string().optional().describe("Filter by project ID"),
      client_id: z.string().optional().describe("Filter by client ID"),
      task_id: z.string().optional().describe("Filter by task ID"),
      active: z.boolean().optional().describe("Filter for active entries only"),
      limit: z.number().optional().default(10).describe("Number of entries to return"),
      offset: z.number().optional().default(0).describe("Number of entries to skip")
    }
  },
  async (args) => {
    try {
      const result = await solidtime.getTimeEntries(args);
      const entries = result.data.map(entry => {
        const duration = entry.end
          ? new Date(entry.end).getTime() - new Date(entry.start).getTime()
          : Date.now() - new Date(entry.start).getTime();
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);

        return `• ${entry.description || '(No description)'} - ${hours}h ${minutes}m ${entry.end ? '(completed)' : '(active)'}`;
      }).join('\n');

      return {
        content: [{
          type: "text",
          text: entries || "No time entries found"
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error listing time entries: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Register Project Tools
server.registerTool(
  "list-projects",
  {
    title: "List Projects",
    description: "List all available projects",
    inputSchema: {
      is_archived: z.boolean().optional().describe("Include archived projects")
    }
  },
  async (args) => {
    try {
      const result = await solidtime.getProjects(args);
      const projects = result.data.map(project =>
        `• ${project.name} (ID: ${project.id})${project.is_archived ? ' [ARCHIVED]' : ''}`
      ).join('\n');

      return {
        content: [{
          type: "text",
          text: projects || "No projects found"
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error listing projects: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

server.registerTool(
  "create-project",
  {
    title: "Create Project",
    description: "Create a new project",
    inputSchema: {
      name: z.string().describe("Name of the project"),
      color: z.string().default("#000000").describe("Color of the project in hex format"),
      client_id: z.string().optional().describe("ID of the client"),
      billable: z.boolean().optional().describe("Whether the project is billable"),
      billable_rate: z.number().optional().describe("Billable rate in cents per hour"),
      is_public: z.boolean().optional().default(false).describe("Whether the project is public"),
      estimated_time: z.number().optional().describe("Estimated time in seconds")
    }
  },
  async (args) => {
    try {
      const project = await solidtime.createProject(args);
      return {
        content: [{
          type: "text",
          text: `Created project: ${project.name} (ID: ${project.id})`
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error creating project: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Register Client Tools
server.registerTool(
  "list-clients",
  {
    title: "List Clients",
    description: "List all available clients",
    inputSchema: {
      is_archived: z.boolean().optional().describe("Include archived clients")
    }
  },
  async (args) => {
    try {
      const result = await solidtime.getClients(args);
      const clients = result.data.map(client =>
        `• ${client.name} (ID: ${client.id})${client.archived_at ? ' [ARCHIVED]' : ''}`
      ).join('\n');

      return {
        content: [{
          type: "text",
          text: clients || "No clients found"
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error listing clients: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

server.registerTool(
  "create-client",
  {
    title: "Create Client",
    description: "Create a new client",
    inputSchema: {
      name: z.string().describe("Name of the client")
    }
  },
  async (args) => {
    try {
      const client = await solidtime.createClient(args);
      return {
        content: [{
          type: "text",
          text: `Created client: ${client.name} (ID: ${client.id})`
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error creating client: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Register Task Tools
server.registerTool(
  "list-tasks",
  {
    title: "List Tasks",
    description: "List tasks for a project",
    inputSchema: {
      project_id: z.string().describe("ID of the project"),
      is_done: z.boolean().optional().describe("Filter by completion status")
    }
  },
  async (args) => {
    try {
      const result = await solidtime.getTasks(args.project_id, {
        is_done: args.is_done
      });
      const tasks = result.data.map(task =>
        `• ${task.name} (ID: ${task.id})${task.is_done ? ' ✓' : ''}`
      ).join('\n');

      return {
        content: [{
          type: "text",
          text: tasks || "No tasks found"
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error listing tasks: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

server.registerTool(
  "create-task",
  {
    title: "Create Task",
    description: "Create a new task for a project",
    inputSchema: {
      project_id: z.string().describe("ID of the project"),
      name: z.string().describe("Name of the task"),
      is_done: z.boolean().optional().default(false).describe("Whether the task is completed")
    }
  },
  async (args) => {
    try {
      const task = await solidtime.createTask(args.project_id, {
        name: args.name,
        is_done: args.is_done
      });
      return {
        content: [{
          type: "text",
          text: `Created task: ${task.name} (ID: ${task.id})`
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error creating task: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Register Member Tools
server.registerTool(
  "list-members",
  {
    title: "List Members",
    description: "List all members in the organization",
    inputSchema: {}
  },
  async (args) => {
    try {
      const result = await solidtime.getMembers();
      const members = result.data.map(member =>
        `• ${member.name} (ID: ${member.id})${member.email ? ` - ${member.email}` : ''}`
      ).join('\n');

      return {
        content: [{
          type: "text",
          text: members || "No members found"
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error listing members: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Register Help Tool
server.registerTool(
  "help",
  {
    title: "Get Help",
    description: "Get help and instructions for using Solidtime MCP tools",
    inputSchema: {
      topic: z.string().optional().describe("Help topic: 'setup', 'time-entry', 'troubleshooting', or leave empty for general help")
    }
  },
  async (args) => {
    const topic = args.topic?.toLowerCase();

    let helpText = "";

    if (!topic || topic === "general") {
      helpText = `
# Solidtime MCP Server Help

## Available Commands:
- **start-timer**: Start tracking time
- **stop-timer**: Stop current time tracking
- **add-time-entry**: Add a completed time entry
- **list-time-entries**: List recent time entries
- **list-projects**: List all projects
- **create-project**: Create a new project
- **list-clients**: List all clients
- **create-client**: Create a new client
- **list-tasks**: List tasks for a project
- **create-task**: Create a new task
- **list-members**: List all organization members

For specific help, use: help with topic "setup", "time-entry", or "troubleshooting"
`;
    } else if (topic === "setup") {
      helpText = `
# Setup Instructions

## Required Environment Variables:
1. **SOLIDTIME_BASE_URL**: Your Solidtime instance URL (e.g., http://localhost:8734)
2. **SOLIDTIME_API_TOKEN**: Personal access token from Solidtime
3. **SOLIDTIME_ORGANIZATION_ID**: Your organization ID
4. **SOLIDTIME_DEFAULT_MEMBER_ID**: Your member ID in the organization

## Getting These Values:

### API Token:
1. Log into Solidtime
2. Go to Settings > Personal Access Tokens
3. Create a new token with all scopes

### Organization ID:
1. In Solidtime, go to Organizations
2. Find your organization ID in the URL or settings

### Member ID:
1. Use the API: GET /api/v1/organizations/{org_id}/members/me
2. Or check the Members section in your organization settings
`;
    } else if (topic === "time-entry") {
      helpText = `
# Adding Time Entries

## IMPORTANT Requirements:

1. **Date Format**: Must be ISO 8601 format with timezone
   - ✅ Correct: "2025-09-25T14:00:00Z"
   - ❌ Wrong: "2025-09-25 14:00:00"

2. **Required Fields**:
   - **start**: Start time (ISO 8601)
   - **end**: End time (ISO 8601)
   - **billable**: true or false (defaults to false if not specified)
   - **member_id**: REQUIRED - Must be a valid member ID (use list-members to find valid IDs)

3. **Optional Fields**:
   - **description**: What you worked on
   - **project_id**: Link to a specific project
   - **task_id**: Link to a specific task
   - **tags**: Array of tags

## Getting Your Member ID:
1. Use list-members to see all organization members
2. Find your name/email and copy the ID

## Example Commands:
- First: list-members() to get your member_id
- Basic: add-time-entry(start: "2025-09-25T14:00:00Z", end: "2025-09-25T16:00:00Z", member_id: "your-member-id")
- With project: add-time-entry(start: "2025-09-25T14:00:00Z", end: "2025-09-25T16:00:00Z", member_id: "your-member-id", billable: true, project_id: "your-project-id", description: "Worked on feature X")

## Common Errors:
- **422 Error**: Check date format and member_id (use list-members to find valid IDs)
- **401 Error**: API token is invalid or expired
- **"Member not found"**: member_id doesn't exist - use list-members to find valid member IDs
`;
    } else if (topic === "troubleshooting") {
      helpText = `
# Troubleshooting Common Issues

## Error 401 (Unauthorized):
- Your API token is invalid or expired
- Solution: Generate a new token in Solidtime settings

## Error 422 (Validation Error):
For time entries:
- Date format must be: "YYYY-MM-DDTHH:mm:ssZ"
- billable field is REQUIRED (true or false)
- member_id must exist in your organization

## Error 404 (Not Found):
- Organization ID is wrong
- Project/Task/Client ID doesn't exist
- Member ID is invalid

## Checking Your Setup:
1. Test authentication: list-projects()
2. If that works, your token and org ID are correct
3. For time entries, ensure SOLIDTIME_DEFAULT_MEMBER_ID is set correctly

## Getting Member ID:
If you don't know your member_id:
1. Check Solidtime UI > Organization > Members
2. Or use the API to get current member info
`;
    } else {
      helpText = `Unknown topic: ${topic}. Available topics: 'setup', 'time-entry', 'troubleshooting'`;
    }

    return {
      content: [{
        type: "text",
        text: helpText.trim()
      }]
    };
  }
);

// Connect to stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Solidtime MCP server started");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});