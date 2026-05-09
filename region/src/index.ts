/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { routes } from '@/root/_routes';
import { rootPage } from '@/root';
import { getRegion } from '@/region';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		if (path == '/' && method == 'GET') {
			return rootPage(routes);
		}

		if (path == '/api/region' && method == 'GET') {
			return getRegion(request);
		}

		return Response.json(
			{
				state: 'Not found',
				status: '404',
				package: 'https://www.npmjs.com/package/next-analytics-installer',
			},
			{ status: 404 },
		);
	},
} satisfies ExportedHandler<Env>;
