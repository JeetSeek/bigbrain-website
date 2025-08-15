# Boiler Brain Assets

Place all web-optimized images (logos, icons, certification images, etc.) in this directory.

**Optimization Tips:**
- Use SVG for logos and icons when possible for best scalability and performance.
- Use PNG/JPG/WebP for photos or complex images, optimized for web (e.g., via TinyPNG, Squoosh).
- Name files clearly (e.g., `logo.svg`, `icon-dashboard.svg`, `cert-iso27001.png`).
- For large sets, consider subfolders: `logos/`, `icons/`, `certifications/`.

**Referencing in Frontend:**
- Import directly: `import Logo from '../assets/logo.svg'` or use as `/assets/logo.svg` in `src`.
- For CDN/external: use the ASSET_BASE_URL env variable (see below).

## External/CDN Images
To load images from a CDN or external storage, set the `VITE_ASSET_BASE_URL` env variable in your `.env` file:

```env
VITE_ASSET_BASE_URL=https://cdn.example.com/assets/
```

Then reference images as `${import.meta.env.VITE_ASSET_BASE_URL}/logo.svg` in your frontend code.
