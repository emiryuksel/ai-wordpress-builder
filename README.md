# AI WordPress Builder

**Describe the site you want. WordPress builds it.**

AI WordPress Builder turns a plain-language brief into a live WordPress site—blog or store—running locally in Docker. Gemini plans the setup, generates images from your prompt, and powers a chat assistant that refines colors, typography, layout, titles, and products in real time.

> **License:** All Rights Reserved. This repository is public for reference only. Use, copying, modification, and distribution are not permitted without explicit written consent.

---

## Overview

Creating a WordPress site usually means themes, plugins, hosting, and hours of configuration. This project removes that friction for prototyping and demos.

You write what you need—*“A minimal blog about packaging design”* or *“A dark-themed electronics store”*—and the app:

1. Interprets your intent with **Google Gemini**
2. Provisions an isolated **Docker stack** (WordPress + MySQL) per project
3. Installs themes, menus, demo content, and **AI-generated imagery** tailored to your prompt
4. Opens a **split builder**: chat on the left, live WordPress preview on the right

Each site runs on its own port (`http://localhost:8001`, `8002`, …). Nothing is shared between projects except the Next.js app on port `3000`.

---

## Features

| Capability | Details |
|------------|---------|
| **Natural-language provisioning** | Blog and WooCommerce stores from a single prompt |
| **AI imagery** | Featured images and product photos generated via Gemini—no stock asset library |
| **Live preview** | iframe preview with automatic refresh after changes |
| **Chat editing** | Colors, fonts, layout, site title, and single-product additions |
| **Per-project isolation** | Dedicated containers, volumes, and runtime config per site |
| **Cleanup scripts** | Stop or fully remove test stacks from the command line |

---

## Requirements

Before you begin, install and start:

| Tool | Version |
|------|---------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Running (`docker --version` works) |
| [Node.js](https://nodejs.org/) | 18 or later |
| [Google Gemini API key](https://aistudio.google.com/apikey) | Required for provisioning and images |

**System notes**

- Docker Desktop needs enough RAM (8 GB+ recommended when multiple sites run).
- On Windows, ensure WSL 2 backend is enabled for Docker.
- Image generation requires a valid `GEMINI_API_KEY`; without it, sites provision but images may fail.

---

## Get started

### 1. Clone the repository

```bash
git clone https://github.com/emiryuksel/ai-wordpress-builder.git
cd ai-wordpress-builder
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Open `.env.local` and set your API key:

```env
GEMINI_API_KEY=your_key_here
```

Optional: override the image model (default tries `gemini-2.5-flash-image`).

```env
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
```

### 4. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> The Next.js dev server must stay running. WordPress sites are served by Docker on separate ports.

---

## Create your first site

1. Confirm Docker Desktop is running.
2. Go to [http://localhost:3000](http://localhost:3000).
3. Enter a prompt, for example:
   - *“A clean blog about sustainable packaging”*
   - *“A dark minimalist electronics store”*
4. Click **Create site** and wait for the progress indicator (typically 1–3 minutes).
5. When ready, you are redirected to the **builder** with a live preview.

### Try the chat assistant

From the builder, you can say:

- `Change the primary color to navy blue`
- `Set heading font to Georgia`
- `Use a boxed layout`
- `Rename the site to TechShop`
- `Add wireless headphones for 899 TRY` *(e-commerce only)*

Successful changes refresh the preview automatically.

---

## Manage Docker stacks

Each provisioned site consumes memory. Clean up when you are done testing.

| Command | Effect |
|---------|--------|
| `npm run stacks:stop` | Stops all stacks; keeps data volumes |
| `npm run stacks:stop -- --keep <projectId>` | Stops all except one project |
| `npm run stacks:purge` | Removes containers, volumes, runtime files, and project records |
| `npm run stacks:purge -- --keep <projectId>` | Purges everything except the kept project |
| `npm run stacks:stop -- --dry-run` | Lists stacks without changing anything |

After `purge`, reclaim orphaned Docker resources if needed:

```bash
docker volume prune -f
docker image prune -a -f   # optional; re-downloads images on next provision
```

---

## Project structure

```
app/                    Next.js App Router — UI and API routes
docker/                 WordPress compose template and wp-init scripts
lib/                    Docker manager, Gemini client, WP-CLI, provisioning
scripts/                CLI utilities (stack cleanup)
data/runtime/           Per-project compose files (gitignored)
data/projects.json      Project registry (gitignored)
```

---

## API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/provision` | Start a new WordPress stack from `{ "prompt": "..." }` |
| `GET` | `/api/provision/status?projectId=` | Poll provisioning status |
| `GET` | `/api/projects/[id]` | Fetch project metadata |
| `POST` | `/api/projects/[id]/repair` | Repair blog theme/images (blog sites) |
| `POST` | `/api/chat` | Apply a natural-language edit to a ready project |

---

## How it works

```
┌─────────────┐     prompt      ┌──────────────┐     intent      ┌─────────────┐
│   Browser   │ ──────────────► │  Next.js API │ ──────────────► │   Gemini    │
│  localhost  │                 │  provision   │                 │   Flash     │
│    :3000    │ ◄────────────── │              │ ◄────────────── │             │
└─────────────┘    status/URL   └──────┬───────┘                 └─────────────┘
                                       │
                                       │ docker compose up
                                       ▼
                              ┌─────────────────┐
                              │  Per-project    │
                              │  WP + MySQL     │
                              │  localhost:80xx │
                              └─────────────────┘
```

1. **Intent parsing** — Site type, title, theme, colors, and plugins are inferred from your prompt.
2. **Docker provision** — A unique stack is created under `data/runtime/<projectId>/`.
3. **WordPress setup** — `wp-cli` runs shell scripts for blog layout (Astra) or WooCommerce (Storefront).
4. **AI content** — Posts, products, and images are generated from your original prompt.
5. **Builder** — Chat actions map to WP-CLI / theme settings for incremental edits.

---

## Scripts

| npm script | Description |
|------------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run stacks:stop` | Stop all test Docker stacks |
| `npm run stacks:purge` | Fully remove all test stacks and data |

---

## Known limitations

This is an **MVP** intended for local development and demos.

- One WordPress instance per project; no multi-tenant hosting layer
- Project state is stored in `data/projects.json` (not a database)
- Chat supports theme tweaks and single product adds—not bulk content or plugin management
- WooCommerce and Astra/Storefront are the primary supported theme paths
- Many concurrent sites will stress Docker memory and CPU
- Provisioning depends on network access for Gemini and WordPress.org package downloads

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| Provisioning times out | Refresh the page; resume runs automatically. Ensure Docker is healthy. |
| No images on posts/products | Verify `GEMINI_API_KEY` in `.env.local`. Restart `npm run dev` after changes. |
| Port already in use | Run `npm run stacks:purge` or stop conflicting containers in Docker Desktop. |
| WordPress unreachable | Wait 30–60s after container start; check `docker ps` for healthy MySQL. |
| Low disk space | Run `npm run stacks:purge` then `docker volume prune -f`. |

---

## License

**All Rights Reserved.** This project is public for reference only. Use, copying, modification, and distribution are not permitted without explicit written consent from the author. See [LICENSE](LICENSE).

---

## Acknowledgments

Built with [Next.js](https://nextjs.org/), [WordPress](https://wordpress.org/), [WooCommerce](https://woocommerce.com/), [Google Gemini](https://ai.google.dev/), and [Docker](https://www.docker.com/).
