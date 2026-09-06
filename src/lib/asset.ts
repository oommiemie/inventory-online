/** Prefixes a path in `public/` with the deployment base, so the app works
 *  both at a site root and under /<repo>/ on GitHub Pages. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
