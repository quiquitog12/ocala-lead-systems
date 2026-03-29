# Ocala Lead Systems

Landing page and brand starter for a local lead-response / intake automation business focused on Ocala, Florida.

## Current assets
- `index.html` — launch landing page
- `BRAND.md` — core positioning and offer

## Temporary contact
- Phone: 352-550-6403

## Notion CRM integration

The free audit form now attempts to POST to `/api/leads` and create a lead directly in Notion.

Required server environment variables:
- `NOTION_API_KEY` — Notion integration token
- `NOTION_DATABASE_ID` — optional override; defaults to the existing Ocala Leads CRM database

Current Notion CRM database:
- Page: `Ocala Lead Systems CRM`
- Database: `Leads`

## Deployment note

This repo is static HTML plus a serverless endpoint at `api/leads.js` for Vercel-style deployments.

If you keep hosting on GitHub Pages, the form will fall back to prefilled email unless you point `window.OCALA_API_BASE` at a separate deployed API endpoint.

## Next upgrades
- deploy the `/api/leads` endpoint on Vercel or another serverless host
- set `NOTION_API_KEY` in the host environment
- add case studies / testimonials once first clients close
