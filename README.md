# Coder
![coder](https://github.com/user-attachments/assets/f93fbda7-d9bd-4175-b922-cd945a1f80bc)

coder (Coder CLI) is a terminal-based coding assistant forked from openai/codex that leverages large language models
to interact with your local codebase. It supports three backends:

- **Ollama**: run models locally via the Ollama API.
- **DeepSeek**: use cloud-based DeepSeek models via the DeepSeek API.
- **OpenAI**: use OpenAI’s hosted API via your OpenAI API key.

## Installation

```bash
git clone git@github.com:conscious-stage/coder.git
cd coder/coder-cli
npm install
npm run build
```

## Providers & Configuration

### 1. Ollama (local)

• No API key required.
• Ensure the Ollama server is running on http://localhost:3000.
• (Optional) Override the URL if needed:
  ```bash
  export OPENAI_BASE_URL="http://localhost:3000/v1"
  # run the ollama server
  cd ollama-api
  npm install
  node api.js
  ```

### 2. DeepSeek API

• Sign up for a DeepSeek API key.
• Set environment variables:
  ```bash
  export DEEPSEEK_API_KEY="<your_deepseek_api_key>"
  export OPENAI_BASE_URL="https://api.deepseek.com"
  ```
• Supported models:
  - deepseek-chat (DeepSeek V3)
  - deepseek-reasoner (DeepSeek R1)

### 3. OpenAI API

• Obtain an API key from https://platform.openai.com/account/api-keys.
• Set environment variables:
  ```bash
  export OPENAI_API_KEY="<your_openai_api_key>"
  export OPENAI_BASE_URL="https://api.openai.com/v1"
  ```

## Usage

After configuring your desired provider:

```bash
# Run with a specific model and prompt
node dist/cli.js -m <model_id> "<your_prompt_here>"

# Examples:
node dist/cli.js -m qwen2.5:0.5b "Hello, how are you?"
node dist/cli.js -m deepseek-chat "Explain the rsync command."
node dist/cli.js -m gpt-4 "Write a Node.js script to parse JSON."
```

## Switching Providers

You can switch providers by setting `OPENAI_BASE_URL` (and API key vars) before running:

```bash
unset OPENAI_BASE_URL
# or set to a different endpoint
export OPENAI_BASE_URL="https://api.openai.com/v1"
export OPENAI_API_KEY="sk-..."

# or for DeepSeek:
export OPENAI_BASE_URL="https://api.deepseek.com"
export DEEPSEEK_API_KEY="..."

# then run:
node dist/cli.js -m <model> "<prompt>"
```

## Troubleshooting

- Ensure environment variables are exported in your shell.
- For Ollama, confirm the local server is up (`http://localhost:3000/health`).
- For DeepSeek and OpenAI, verify your API key and network access.

---
*This README was updated to document multi-provider support (Ollama, DeepSeek, OpenAI) and configuration steps.*
