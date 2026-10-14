# APEX OMEGA verification checkpoint — 2026-10-14

## Architectural source of truth

`apex-neural-core` is the maintained Worker deployment repository. The `APEX/cloudflare-brain` directory is an earlier bootstrap copy (same original source blob), not the larger AI Studio app. Do not create new deployments from that stale template. The current Forge application is the only backend inspected in this checkpoint; do not overwrite AI Studio source until it has been retrieved and compared.

Browser → Forge authenticated endpoint → atomic per-user request quota → request-specific HS256 JWT → Cloudflare Worker → Forge signature/hash/nonce verifier → Workers AI binding → Forge execution records.

The Worker has no tools or personal database access. Model text is not authorization. Forge's planner validates model proposals against a read-only tool allowlist. Execution requires a separate authenticated user action.

## Evidence observed

- Previous GitHub workflow 38443078966 succeeded for commit 5a6784acd326b8cc2cc2c2d55142d119cf575ce4. It only installed dependencies and type-checked.
- Forge is published on a free plan at https://apex-forge-intelligence.floot.app.
- Read-only database queries returned 40 saved jobs, zero campaigns, zero plans, zero AI runs and zero registered Worker URLs. These counts are a snapshot, not evidence of completed applications.
- Forge policy and provider spec files passed. Their provider tests are mocked, not live inference tests.
- Cloudflare dashboard requires sign-in in this session. Worker URL, deployment status, account plan and remaining quota remain unverified.

## Repairs in this checkpoint

- Bound actual request bytes to 14,000, even without Content-Length or with a misleading header.
- Reject malformed UTF-8/JSON, whitespace-only instructions, invalid bearer syntax and unsupported content types/encoding.
- Fail closed on verifier rejection, malformed approval, network failure, server failure or quota exhaustion.
- Distinguish liveness from inference readiness. Health explicitly reports inference UNVERIFIED.
- Return provider/model/latency only after the AI binding returns a valid result.
- Add 30 regression tests and a lockfile-based CI pipeline with TypeScript and Wrangler dry-run packaging.

These tests use injected verifier and AI responses. They establish local control flow, not real Cloudflare model access, database replay protection or end-to-end security certification.

## Free-tier assessment

Official sources checked 2026-10-14:
- https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/ explicitly lists Gemma 4 26B A4B among models remaining available on Free.
- https://developers.cloudflare.com/workers-ai/platform/pricing/ documents a shared account allowance of 10,000 neurons per day. Free requests fail after the allowance; a paid account can incur overage.

Repository configuration cannot establish the account's billing plan. Confirm Workers Free and available allowance before any live inference. Do not upgrade or enable paid billing. Per-user five-attempt quotas in Forge are not an account-wide neuron budget and do not protect against spending on an already-paid account. Floot hosting credits are finite; current publication is not a promise of perpetual free hosting.

## Remaining security and reliability work

- Forge nonce insertion uses a unique conflict guard. Live expiry, replay, concurrent consumption and cross-user tests remain necessary.
- Session exchange reads then deletes a temporary token; atomically consuming it and separating temporary/session purposes requires repair and regression coverage.
- No global inference allowance enforcement was verified.
- Planner and tool states are persisted, but no leases, crash recovery or schedules were found in inspected execution paths. Do not call this unattended autonomy.
- Provider runtime inspection currently overlooks the signed-Worker configuration.
- A registered workers.dev URL's health claim does not prove owner control. Review destination trust before sending private prompts.
- The larger Google AI Studio application has not been audited; its previously reported vulnerabilities are not verified as fixed.

## Gate ledger

1 Deployment: BLOCKED by Cloudflare sign-in.
2 Live inference: BLOCKED by deployment/account verification.
3 Backend authentication: PARTIAL source inspection; not certified.
4 Persistence: VERIFIED existing Postgres read; durability/restart gates remain open.
5 Valid plans: UNIT TESTS ONLY; no real saved plan or model output.
6 Tools: SOURCE INSPECTED; end-to-end user execution pending.
7 Restart survival: NOT VERIFIED.
8 Frontend/brain connection: NOT CONFIGURED (zero gateway configurations).
9 Redesign/browser QA: NOT STARTED; security work takes precedence.
10 Discovery: 40 existing records; current live source fetch not verified here.
11 Resume provenance: NOT IMPLEMENTED/VERIFIED in inspected application.
12 Integrations: NOT VERIFIED.
13 Applications: disabled; no submissions claimed or performed.
14 Cost controls: PARTIAL (per-user quotas); account plan still unknown.
15 Regression/security: local Worker suite and existing Forge specs only.

## Recovery and deployment

Preserve original main commit as the rollback point. Review this branch, then deploy the maintained repository through the existing official Cloudflare integration after account/free-plan verification. No secrets belong in GitHub. Verify /health, rejected unauthenticated /reason and a single authorized test instruction through the actual Forge account. Record model, provider, latency and result only from that live invocation. Do not retry uncertain inference automatically: one-time authorization is consumed before inference and retries require a new budget claim.

Floot migration requires exporting actual source/schema, replacing platform authentication/runtime modules, preserving user ownership and nonce uniqueness, testing with non-personal fixtures, then performing an explicitly reviewed data migration. No data migration has occurred.
