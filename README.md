# Bedrock Chat

A self-contained chat webapp powered by AWS Bedrock. Clone, install, run.

## Quick Start

```bash
# 1. Clone
git clone <repo-url>
cd bedrock-chat

# 2. Install backend
pip install -r requirements.txt

# 3. Build frontend
cd frontend
npm install
npm run build
cd ..

# 4. Run
python run.py
```

The app prompts for an encryption passphrase on startup (encrypts chat history at rest), then opens at **http://127.0.0.1:8080**.

## Requirements

- **Python 3.11+**
- **Node.js 18+** (frontend build only — not needed at runtime)
- **AWS credentials** with Bedrock access (see below)

## AWS Setup

### Credentials

Configure via any standard method:
- Environment variables: `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`
- AWS config file: `~/.aws/credentials`
- IAM role (EC2/ECS)
- SSO: `aws sso login`

### Minimal IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/*"
    }
  ]
}
```

### Region

Default region is `us-east-1`. Override via `.env` or environment variable:

```bash
export BEDROCK_CHAT_AWS_REGION=us-west-2
```

## Configuration

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `BEDROCK_CHAT_HOST` | `127.0.0.1` | Bind address (use `0.0.0.0` for network access) |
| `BEDROCK_CHAT_PORT` | `8080` | Server port |
| `BEDROCK_CHAT_AWS_REGION` | `us-east-1` | AWS region |
| `BEDROCK_CHAT_AWS_PROFILE` | *(empty)* | AWS profile name (optional) |
| `BEDROCK_CHAT_PASSPHRASE` | *(prompted)* | Encryption passphrase (skip prompt) |
| `BEDROCK_CHAT_MAX_CONTEXT_MESSAGES` | `50` | Sliding window for Bedrock calls |

## Encryption

All chat message content is encrypted at rest using Fernet (AES-128-CBC) via a key derived from your passphrase (PBKDF2, 100k iterations). The key only exists in memory — never written to disk. A random salt is stored in `data/salt.bin`.

**Important**: If you forget the passphrase, existing chat history cannot be decrypted.

## Adding Models

### Via the UI
Click the gear icon next to the model dropdown, then "Add Model".

### Via JSON
Edit `data/models.json` — changes take effect on the next API call (no restart needed).

## Team Deployment (HTTPS)

For sharing on a network, use a reverse proxy for TLS:

```nginx
server {
    listen 443 ssl;
    server_name chat.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;  # Required for SSE streaming
    }
}
```

Set the bind address to allow connections:
```bash
BEDROCK_CHAT_HOST=0.0.0.0
```

## Project Structure

```
bedrock-chat/
├── run.py                  # Entry point
├── backend/                # FastAPI server
│   ├── routers/            # API endpoints
│   ├── services/           # Bedrock, conversation, model config
│   ├── database/           # SQLite + SQLAlchemy models
│   ├── schemas/            # Pydantic validation
│   └── utils/              # Encryption, streaming helpers
├── frontend/               # React + TypeScript + Tailwind v4
│   └── src/
│       ├── components/     # UI components
│       ├── hooks/          # State management
│       └── services/       # API client, SSE parser
├── data/                   # Runtime data (gitignored)
└── tests/                  # Test suite
```

## License

MIT
