# Scenario: woo-mcp-connect

## Prompt

Help me connect my WooCommerce store to Claude Code using MCP.

## Expected behavior

- Uses `woo-mcp-connect` when the prompt matches its description.
- Asks for the store URL before providing configuration commands.
- Asks whether the environment is production or local development.
- For local development, includes the insecure transport filter.
- Provides the correct `claude mcp add` command with user's URL.
- Guides user through API key creation with direct admin link.
