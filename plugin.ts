import { TokenRingPlugin } from '@tokenring-ai/app';
import { WebHostService } from '@tokenring-ai/web-host';
import SPAResource from '@tokenring-ai/web-host/SPAResource';
import { z } from 'zod';
import packageJSON from '../package.json' with { type: 'json' };

const configSchema = z.object({
  electron: z.object({
    enabled: z.boolean().default(true),
    port: z.number().default(3456),
    host: z.string().default('127.0.0.1'),
    dataDirectory: z.string().default('~/.tokenring'),
    workingDirectory: z.string().default('~'),
  }).optional(),
});

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: 'TokenRing Coder Electron Integration',
  async install(app, config) {
    // Only configure web host if Electron integration is enabled
    const electronConfig = config.electron ?? { enabled: true, port: 3456, host: '127.0.0.1' };

    if (!electronConfig.enabled) {
      console.log('[Electron Plugin] Electron integration is disabled');
      return;
    }

    console.log('[Electron Plugin] Configuring for Electron integration');

    // Wait for WebHostService and configure it for Electron
    app.waitForService(WebHostService, (webHostService) => {
      console.log('[Electron Plugin] WebHostService available, checking for SPA resource');

      // The SPA resource is typically registered by the chat frontend plugin
      // We just need to ensure the web host is configured correctly
      const url = webHostService.getURL();
      console.log(`[Electron Plugin] WebHost available at ${url}`);
    });
  },
  config: configSchema,
} satisfies TokenRingPlugin<typeof configSchema>;
