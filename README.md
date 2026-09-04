# AyushLohani's AI Agent

A clean, humanized, modern-premium AI chat website with:
- Dark / Light mode
- Multilingual conversation
- Multiple local conversations
- Copy and regenerate
- Browser voice input
- Browser voice output
- Image upload for vision-capable models
- Secure server-side OpenAI API key

## Run in Termux

```bash
pkg update -y
pkg install nodejs -y
cd AyushLohani-AI-Agent
npm install
cp .env.example .env
nano .env
npm start
```

Put your API key in `.env`. Never commit `.env` to GitHub.

Then open:
`http://localhost:3000`

The model is configurable with `OPENAI_MODEL`.
