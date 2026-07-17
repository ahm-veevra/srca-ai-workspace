# SRCA AI Workspace

**The Saudi Red Crescent Authority's intelligent intranet portal — its business AI
application suite.**

The SRCA AI Workspace is a **separate application** from the AICP console. It is the
business experience layer that consumes AICP **only through its HTTP API** — it never
talks to a model provider directly and contains no AI intelligence of its own. All
intelligence, governance and data sovereignty live in AICP; this portal is the branded,
bilingual (Arabic/English) window onto it for SRCA staff.

```
SRCA staff
  ↓
SRCA AI Workspace  (this app — intelligent intranet portal)
  ↓  HTTP (AICP API, tenant: srca)
AICP               (the AI Operating Platform)
  ↓
Models / OCR / Knowledge / Agents / Governance
```

## Why it's separate

| | AICP (`web/`) | SRCA AI Workspace (`web-workspace/`) |
|---|---|---|
| Role | AI Operating Platform — gateway, models, knowledge, agents, governance, admin | Business Application Suite — the outcomes users want |
| Audience | Platform / AI administrators | Business users, executives, demos, training |
| URL (suggested) | `aicp.srca.local` | `workspace.srca.local` |
| Deploy | Independent | Independent |

Both apps are **independently deployable and scalable**, and share **SSO, identity and
RBAC** via the same Keycloak realm and the same AICP backend.

### Shared SSO

Both apps proxy `/api/*` to the **same AICP backend** (`API_INTERNAL_URL`), so auth cookies
stay first-party to each app's origin, and identity/RBAC come from the one backend +
Keycloak realm. How a single sign-in covers both apps:

- **Local dev** — both run on `localhost` (AICP `:3000`, SRCA AI Workspace `:3010`). Cookies are
  per-host (not per-port), so the AICP session cookie already covers both. Nothing to set.
- **Production (separate sub-domains, e.g. `aicp.srca.local` + `workspace.srca.local`)**
  — set the session cookie on the common **parent domain** so every sub-domain sends it:

  ```env
  # AICP backend (.env)
  COOKIE_DOMAIN=.srca.local           # shared across *.srca.local sub-domains
  COOKIE_SECURE=true                    # HTTPS
  COOKIE_SAMESITE=lax                   # same-site sub-domains
  PORTAL_URL=https://aicp.srca.local
  SSO_EXTRA_ORIGINS=https://workspace.srca.local   # allow-listed post-login return target
  ```

  Then one login (Keycloak or local) sets the session at `.srca.local`, and **both apps
  are authenticated**. A Keycloak login started in SRCA AI Workspace returns to SRCA AI Workspace
  (origin is allow-listed; non-allow-listed origins are rejected — no open redirect).

- **Keycloak** — add **both** app origins as valid redirect URIs / web origins on the
  `aicp-portal` client. The OIDC callback is handled by the AICP backend (proxied), and the
  shared Keycloak session provides true SSO across both apps.

For fully **cross-site** origins (different registrable domains) use `COOKIE_SAMESITE=none`
(+ `COOKIE_SECURE=true`); sub-domains of one parent (the recommended setup) use `lax`.

## What's inside

- **Home** (`/workspace`) — "What would you like to do today?" business launcher.
- **V-GPT** (`/v-gpt`) — enterprise AI chat over AICP (`/inference`): multi-turn, knowledge
  grounding, per-message transparency (model used, governance, knowledge source, trace).
- **Intelligence Centers** — Contract, RFP & Tender, Research, Meeting, HR, Procurement,
  Project. Each calls an AICP analysis API and renders structured results plus a
  "Powered by AICP" transparency bar.
- **AI Capability Marketplace** (`/capabilities`) — every AICP capability, its business
  value, and where it's demonstrated.
- **Validation Center** (`/aicp-validation`) — live pass/warn/fail checks of AICP.
- **Learning Center** (`/learn`) — plain-language guides to AICP.

Centers that surface an existing AICP admin surface (Knowledge, Agents, Document
Intelligence, …) deep-link into the AICP console via `NEXT_PUBLIC_AICP_URL`.

## Running

```bash
# In the stack (recommended) — starts on http://localhost:3010
docker compose up -d web-workspace      # AICP console stays on :3000

# Or standalone
cp .env.example .env                     # set API_INTERNAL_URL + NEXT_PUBLIC_AICP_URL
npm install
npm run dev                              # http://localhost:3010
```

`API_INTERNAL_URL` is the server-side proxy target for AICP's API; `NEXT_PUBLIC_AICP_URL`
is the AICP console origin used for cross-app links.

## API-first rule

Every SRCA AI Workspace capability calls an AICP API. If a capability needs something AICP does
not yet expose, add the API to AICP — never bypass it to reach a model provider.
