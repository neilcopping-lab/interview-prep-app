# Getting Your API Keys — Step by Step

Before I can wire up real AI report generation and real transcription, you need two
things: an Anthropic account (for the AI that writes the report) and an OpenAI account
(for turning spoken answers into text). Both take about 5 minutes each. Stripe (for
taking real payment) comes later, once these two are working — no need to set it up yet.

**Cost expectation:** based on the unit economics we worked out earlier, generating one
report costs well under £1 in API usage. £5 of credit on each account will cover
dozens of test reports before you need to top up.

---

## Part 1 — Get an Anthropic API key

Anthropic makes Claude, the AI that will write your company research, gap analysis and
STAR answers.

1. Go to **[console.anthropic.com](https://console.anthropic.com)**.
2. Click **Sign up**. You can use your email, or "Continue with Google" for a faster setup.
3. Verify your email if asked (check your inbox for a code or link).
4. Once logged in, you'll land on the Console. In the left-hand menu, click **Settings**, then **Plans & Billing** (or **Billing**).
5. Click **Add to credit balance**, enter a card, and add **$5** — this is the minimum needed to actually generate keys that work at a usable rate limit. You won't be charged anything beyond what you actually use.
6. Still in Settings, click **API keys** (or go directly to **[console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)**).
7. Click **Create Key**.
8. Give it a name you'll recognise later, e.g. `interview-prep-app-production`.
9. Click **Create**. Your key will be shown **once** — copy it immediately and paste it somewhere safe (a notes app, a password manager). If you navigate away without copying it, you'll have to make a new one.

Keep this key somewhere private for now — you'll paste it into Render in Part 3, not into this chat.

---

## Part 2 — Get an OpenAI API key

OpenAI's Whisper model is what will turn a recorded voice answer into text.

1. Go to **[platform.openai.com](https://platform.openai.com)**.
2. Click **Sign up**. Email, Google, Microsoft or Apple all work.
3. Verify your email, and verify a phone number if asked — this is OpenAI's standard anti-abuse check, not optional.
4. If prompted to create an "organization," accept the default option — you can rename it later if you want.
5. In the left-hand sidebar, click **Settings**, then **Billing**.
6. Add a card and load **$5** of prepaid balance. Like Anthropic, you can't generate a working key without this.
7. In the left-hand sidebar, click **API keys** (or go to **[platform.openai.com/api-keys](https://platform.openai.com/api-keys)**).
8. Click **Create new secret key**.
9. Give it a name, e.g. `interview-prep-app-production`, and leave the default permissions unless you know you want to restrict them.
10. Click **Create secret key**. Copy it immediately — same rule as Anthropic, you only get to see it once.

---

## Part 3 — Add both keys to Render

This is where the keys actually get used — safely, without ever being typed into code or into this chat.

1. Go to **[dashboard.render.com](https://dashboard.render.com)** and open your `interview-prep-app` service.
2. Click the **Environment** tab.
3. Click **Add Environment Variable**.
4. Add the first one:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** paste the key from Part 1
5. Click **Add Environment Variable** again and add the second:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** paste the key from Part 2
6. Click **Save Changes**. Render will automatically redeploy the app with both keys available to it.

---

## What happens next

Once both keys are saved in Render, let me know and I'll write the actual code that uses
them — replacing the placeholder company research, gap analysis, STAR drafting and
transcription with real AI calls. You won't need to touch the code yourself; just
confirm the keys are in and I'll do the wiring.

Stripe (for taking real £45 / £29 payments) is a separate, slightly bigger step — we'll
tackle that once these two are live and you're happy with the report quality.
