import { routes } from '@/root/_routes';
import { rootPage } from '@/root';
import { getRegion } from '@/region';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	'Access-Control-Max-Age': '86400',
};

function withCors(response: Response): Response {
	const newHeaders = new Headers(response.headers);

	for (const [key, value] of Object.entries(corsHeaders)) {
		newHeaders.set(key, value);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders,
	});
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		// Handle CORS preflight
		if (method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: corsHeaders,
			});
		}

		if (path === '/' && method === 'GET') {
			return withCors(rootPage(routes));
		}

		if (path === '/api/region' && method === 'GET') {
			return withCors(await getRegion(request));
		}

		return withCors(
			Response.json(
				{
					state: 'Not found',
					status: '404',
					package: 'https://www.npmjs.com/package/next-analytics-installer',
				},
				{ status: 404 },
			),
		);
	},
} satisfies ExportedHandler<Env>;