# Solidtime MCP Server

An MCP (Model Context Protocol) server for integrating with Solidtime time tracking application. This server allows AI assistants like Claude to interact with your Solidtime instance for time tracking, project management, and client management.

## Features

### Time Tracking
- **Start Timer**: Begin tracking time for a project or task
- **Stop Timer**: Stop the currently active time tracking
- **Add Time Entry**: Add completed time entries with specific start/end times (requires member_id)
- **List Time Entries**: View recent time entries with filters
- **List Members**: View all organization members to get member IDs

### Project Management
- **List Projects**: View all available projects
- **Create Project**: Create new projects with customizable settings

### Client Management
- **List Clients**: View all available clients
- **Create Client**: Create new clients

### Task Management
- **List Tasks**: View tasks for a specific project
- **Create Task**: Create new tasks within projects

## Installation

1. Clone or copy the MCP server files to your desired location
2. Install dependencies:
   ```bash
   cd mcp-solidtime
   npm install
   ```

3. Build the TypeScript files:
   ```bash
   npm run build
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Solidtime credentials:
   - `SOLIDTIME_BASE_URL`: Your Solidtime instance URL
   - `SOLIDTIME_API_TOKEN`: API token from Solidtime
   - `SOLIDTIME_ORGANIZATION_ID`: Your organization ID
   - `SOLIDTIME_DEFAULT_MEMBER_ID`: Default member ID (optional)

## Getting Solidtime API Credentials

1. **API Token**:
   - Log into your Solidtime instance
   - Go to Account Settings > API Tokens
   - Create a new API token with appropriate permissions

2. **Organization ID**:
   - Navigate to your organization settings
   - The organization ID is typically in the URL or settings page

3. **Member ID**:
   - Can be found in the Members section of your organization
   - This is your user's member ID within the organization

## Configuration in Claude Desktop

Add the following to your Claude Desktop configuration file:

### macOS
Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows
Location: `%APPDATA%\Claude\claude_desktop_config.json`

### Linux
Location: `~/.config/Claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "solidtime": {
      "command": "node",
      "args": ["/path/to/mcp-solidtime/dist/index.js"],
      "env": {
        "SOLIDTIME_BASE_URL": "http://your-solidtime-instance.com",
        "SOLIDTIME_API_TOKEN": "your_api_token_here",
        "SOLIDTIME_ORGANIZATION_ID": "your_org_id_here",
        "SOLIDTIME_DEFAULT_MEMBER_ID": "your_member_id_here"
      }
    }
  }
}
```

Replace the paths and credentials with your actual values.

## Important: Time Entry Requirements

When using `add-time-entry`, you MUST provide:
1. **Date Format**: ISO 8601 format with timezone (e.g., "2025-09-25T14:00:00Z")
2. **Required Fields**:
   - `start`: Start time in ISO 8601 format
   - `end`: End time in ISO 8601 format
   - `billable`: MUST be `true` or `false` (this field is required!)
3. **Member ID**: Either set `SOLIDTIME_DEFAULT_MEMBER_ID` in your config or provide `member_id` in the command

### Getting Your Member ID

To find your member ID:
1. Check the Solidtime UI under Organization > Members
2. Or use the Solidtime API: `GET /api/v1/organizations/{org_id}/members/me`

## Usage Examples

Once configured, you can ask Claude to:

- "Start tracking time for the Website Redesign project"
- "Stop my current timer"
- "Add 2 hours of work I did yesterday on the API Integration project" (Note: must include billable: true/false)
- "Show me my recent time entries"
- "List all active projects"
- "Create a new project called Mobile App Development"
- "List all clients"
- "Create a new client called Acme Corp"
- "Show tasks for project ID xyz"
- "Create a task 'Setup CI/CD pipeline' for project abc"
- "Get help with time entry format" (uses the built-in help tool)

## Development

### Running in Development Mode
```bash
npm run dev
```

### Type Checking
```bash
npm run type-check
```

### Building
```bash
npm run build
```

## API Limitations

- The server currently uses Solidtime's REST API v1
- Rate limiting depends on your Solidtime instance configuration
- Some operations require specific permissions in your API token

## Troubleshooting

1. **Authentication Errors**: Verify your API token has the necessary permissions
2. **Organization Not Found**: Double-check your organization ID
3. **Member ID Issues**: Ensure the member ID belongs to the specified organization
4. **Connection Issues**: Verify your Solidtime instance URL is correct and accessible

## License

This MCP server is provided as-is for integration with Solidtime. Please refer to your Solidtime license for usage terms.