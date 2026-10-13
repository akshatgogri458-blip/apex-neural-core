# APEX Neural Core — Free Cloudflare Worker

This Worker uses Cloudflare Workers AI with a binding. **No Cloudflare API token or Account ID is needed inside APEX Forge.**

A signed, short-lived, one-use permission token is issued by the authenticated APEX Forge backend and verified by the same backend before any AI invocation. No user resumes or credentials belong in this public GitHub repository.

## One-click deployment

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/akshatgogri458-blip/APEX/tree/main/cloudflare-brain)

Cloudflare may request sign-in and confirmation of the Worker name, account and free Workers AI binding. **Do not select a paid plan.** The resulting `https://<worker-name>.<subdomain>.workers.dev` URL is needed to connect this Worker to your private APEX Forge user account.

## Endpoints
- `GET /health` provides public non-sensitive service status.
- `POST /reason` requires a one-time bearer authorization signed by APEX Forge. Incoming instruction is hashed and verified by a backend call before Gemma executes. Calls that fail authorization never reach Workers AI.

## Operational constraints
Cloudflare Workers Free / Workers AI have request, inference and usage limits. Only user-approved authenticated inference is authorized; paid usage is not enabled by this repository. The model `@cf/google/gemma-4-26b-a4b-it` must be available to the deploying account.

**Known limitation:** Verification depends on Floot-hosted APEX Forge being online. Floot's nonrecurring free hosting credits cannot guarantee uninterrupted access. Move verification to a sustainable free host before relying on continuous autonomy.
