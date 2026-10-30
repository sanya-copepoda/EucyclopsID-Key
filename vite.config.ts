import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function repoAssetsSaverPlugin(): Plugin {
  return {
    name: 'repo-assets-saver',
    configureServer(server) {
      server.middlewares.use('/api/save-repo-assets', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body || '{}');
            const savedPaths: string[] = [];

            if (Array.isArray(payload.files)) {
              for (const fileItem of payload.files) {
                const relPath = String(fileItem.relPath || '')
                  .replace(/^\/+/, '')
                  .replace(/\.\./g, '');
                const dataUrl = String(fileItem.dataUrl || '');
                if (!relPath.startsWith('assets/') || !dataUrl.startsWith('data:')) {
                  continue;
                }
                const commaIdx = dataUrl.indexOf(',');
                if (commaIdx === -1) continue;
                const base64Data = dataUrl.slice(commaIdx + 1);
                const fullDest = path.resolve(__dirname, 'public', relPath);
                fs.mkdirSync(path.dirname(fullDest), {recursive: true});
                fs.writeFileSync(fullDest, Buffer.from(base64Data, 'base64'));
                savedPaths.push(relPath);
              }
            }

            if (payload.mediaBundle && typeof payload.mediaBundle === 'object') {
              const bundleDest = path.resolve(__dirname, 'public/assets/media_bundle.json');
              fs.mkdirSync(path.dirname(bundleDest), {recursive: true});
              fs.writeFileSync(bundleDest, JSON.stringify(payload.mediaBundle, null, 2), 'utf-8');
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ok: true, savedCount: savedPaths.length, savedPaths}));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ok: false, error: String(err)}));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    // Relative base './' ensures the compiled bundle works seamlessly on GitHub Pages
    // under any repository subpath (https://<user>.github.io/<repo>/) as well as root domains.
    base: './',
    plugins: [react(), tailwindcss(), repoAssetsSaverPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
