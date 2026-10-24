import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

const API_BASE_URL = 'https://api.jaww.ws/api/v1';

export interface PaginationMeta extends IDataObject {
	current_page: number;
	last_page: number;
	per_page: number;
	total: number;
}

export interface PaginatedResponse extends IDataObject {
	meta?: PaginationMeta;
}

export interface BinaryApiResponse {
	body: Buffer | ArrayBuffer;
	headers?: unknown;
}

export function compactObject(input: IDataObject): IDataObject {
	return Object.fromEntries(
		Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== ''),
	) as IDataObject;
}

export function parseFilename(contentDisposition: unknown, fallback: string): string {
	const match = String(contentDisposition ?? '').match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
	return match?.[1] ? decodeURIComponent(match[1].trim()) : fallback;
}

export function normaliseMimeType(value: unknown, fallback = 'application/octet-stream'): string {
	const type = String(value ?? '').split(';')[0]?.trim();
	return type || fallback;
}

export function normaliseInteger(value: unknown): number | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	const parsed = Number.parseInt(String(value), 10);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function chooseBestLinkMatch(links: IDataObject[], query: string): IDataObject | undefined {
	const needle = query.trim().toLowerCase();
	if (!needle) return undefined;

	return links.find((link) => {
		const values = [link.id, link.slug, link.short_url, link.title, link.destination_url];
		return values.some((value) => String(value ?? '').toLowerCase() === needle);
	});
}

export async function bytesApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		url: `${API_BASE_URL}${endpoint}`,
		headers: {
			Accept: 'application/json',
		},
		json: true,
	};

	const requestBody = compactObject(body);
	const requestQuery = compactObject(qs);

	if (Object.keys(requestBody).length > 0) options.body = requestBody;
	if (Object.keys(requestQuery).length > 0) options.qs = requestQuery;

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'jawwwsBytesApi',
			options,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function bytesApiBinaryRequest(
	this: IExecuteFunctions,
	endpoint: string,
	qs: IDataObject = {},
): Promise<BinaryApiResponse> {
	const options: IHttpRequestOptions = {
		method: 'GET',
		url: `${API_BASE_URL}${endpoint}`,
		headers: {
			Accept: '*/*',
		},
		qs: compactObject(qs),
		encoding: 'arraybuffer',
		returnFullResponse: true,
		json: false,
	};

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'jawwwsBytesApi',
			options,
		)) as BinaryApiResponse;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function bytesApiRequestAllItems(
	this: IExecuteFunctions,
	propertyName: string,
	endpoint: string,
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const output: IDataObject[] = [];
	let page = 1;
	let lastPage = 1;

	do {
		const response = (await bytesApiRequest.call(this, 'GET', endpoint, {}, {
			...qs,
			page,
			per_page: 100,
		})) as PaginatedResponse;

		const items = response[propertyName];
		if (Array.isArray(items)) output.push(...(items as IDataObject[]));

		const meta = response.meta;
		lastPage = typeof meta?.last_page === 'number' ? meta.last_page : page;
		page += 1;
	} while (page <= lastPage);

	return output;
}
