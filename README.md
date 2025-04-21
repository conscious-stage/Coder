# open-codex
By default we point at your local Ollama server (via the hard‑coded default
    OPENAI_BASE_URL="http://localhost:3000/v1"), but you can override that at runtime:

        1. Make sure your OpenAI key is set in OPENAI_API_KEY.
        2. Point the CLI at the real OpenAI endpoint by setting OPENAI_BASE_URL before your command. For example:

               export OPENAI_API_KEY="sk‑…"
               export OPENAI_BASE_URL="https://api.openai.com/v1"
               node dist/cli.js -m gpt-4

    Now Codex‑CLI will use the official OpenAI API for both model list and chat calls. If you later want Ollama again, just
    unset or reset OPENAI_BASE_URL back to your local URL:

        unset OPENAI_BASE_URL
        # or
        export OPENAI_BASE_URL="http://localhost:3000/v1"

    That switch alone is all you need—no code changes required.
