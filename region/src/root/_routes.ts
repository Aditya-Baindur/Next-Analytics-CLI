type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type Route = {
	method: Method;
	path: string;
	description: string;
};

export const routes: Route[] = [{ method: 'GET', path: '/api/region', description: "Returns the end user's region" }];
