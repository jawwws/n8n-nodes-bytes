import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import {
	bytesApiBinaryRequest,
	bytesApiRequest,
	bytesApiRequestAllItems,
	chooseBestLinkMatch,
	compactObject,
	normaliseInteger,
	normaliseMimeType,
	parseFilename,
} from './GenericFunctions';

const linkOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['link'] } },
		options: [
			{ name: 'Add Tag', value: 'addTag', action: 'Add a tag to a link' },
			{ name: 'Archive', value: 'archive', action: 'Archive a link' },
			{ name: 'Create', value: 'create', action: 'Create a link' },
			{ name: 'Find', value: 'find', action: 'Find a link' },
			{ name: 'Get', value: 'get', action: 'Get a link' },
			{ name: 'Get QR', value: 'getQr', action: 'Get a link QR file' },
			{ name: 'List', value: 'list', action: 'List links' },
			{ name: 'Remove Tag', value: 'removeTag', action: 'Remove a tag from a link' },
			{ name: 'Update', value: 'update', action: 'Update a link' },
		],
		default: 'create',
	},
];

const linkFields: INodeProperties[] = [
	{
		displayName: 'Destination URL',
		name: 'destinationUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://example.com/campaign',
		displayOptions: { show: { resource: ['link'], operation: ['create'] } },
		description: 'The HTTP or HTTPS destination for the measurable Link',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['link'], operation: ['create'] } },
	},
	{
		displayName: 'Custom Short Slug',
		name: 'slug',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['link'], operation: ['create'] } },
		description: 'Leave blank to let Bytes generate the slug',
	},
	{
		displayName: 'Activity Group',
		name: 'activityGroupId',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['link'], operation: ['create'] } },
		description: 'Optional Activity Group public ID or slug',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['link'], operation: ['create'] } },
		options: [
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'options',
				options: [
					{ name: 'Ads', value: 'ads' },
					{ name: 'Email', value: 'email' },
					{ name: 'Other', value: 'other' },
					{ name: 'Print', value: 'print' },
					{ name: 'SMS', value: 'sms' },
					{ name: 'Social', value: 'social' },
				],
				default: 'other',
			},
			{ displayName: 'Expires At', name: 'expiresAt', type: 'dateTime', default: '' },
			{ displayName: 'Notes', name: 'notes', type: 'string', default: '', typeOptions: { rows: 3 } },
			{ displayName: 'UTM Campaign', name: 'utmCampaign', type: 'string', default: '' },
			{ displayName: 'UTM Content', name: 'utmContent', type: 'string', default: '' },
			{ displayName: 'UTM Medium', name: 'utmMedium', type: 'string', default: '' },
			{ displayName: 'UTM Source', name: 'utmSource', type: 'string', default: '' },
			{ displayName: 'UTM Term', name: 'utmTerm', type: 'string', default: '' },
		],
	},
	{
		displayName: 'Link ID',
		name: 'linkId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['link'],
				operation: ['get', 'update', 'archive', 'getQr', 'addTag', 'removeTag'],
			},
		},
		description: 'Immutable public Bytes Link ID',
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['link'], operation: ['find'] } },
		description: 'Find by public ID, slug, short URL, title or destination URL',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['link'], operation: ['list'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		displayOptions: { show: { resource: ['link'], operation: ['list'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['link'], operation: ['list'] } },
		options: [
			{ displayName: 'Query', name: 'query', type: 'string', default: '', description: 'Search slug, title or destination URL' },
			{ displayName: 'Tag ID', name: 'tagId', type: 'string', default: '', description: 'Filter by public Tag ID' },
			{ displayName: 'Tag Slug', name: 'tagSlug', type: 'string', default: '', description: 'Filter by workspace Tag slug' },
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['link'], operation: ['update'] } },
		options: [
			{ displayName: 'Activity Group', name: 'activityGroupId', type: 'string', default: '', description: 'Activity Group public ID or slug' },
			{ displayName: 'Channel', name: 'channel', type: 'options', options: [
				{ name: 'Ads', value: 'ads' },
				{ name: 'Email', value: 'email' },
				{ name: 'Other', value: 'other' },
				{ name: 'Print', value: 'print' },
				{ name: 'SMS', value: 'sms' },
				{ name: 'Social', value: 'social' },
			], default: 'other' },
			{ displayName: 'Destination URL', name: 'destinationUrl', type: 'string', default: '' },
			{ displayName: 'Expires At', name: 'expiresAt', type: 'dateTime', default: '' },
			{ displayName: 'Is Active', name: 'isActive', type: 'boolean', default: true },
			{ displayName: 'Notes', name: 'notes', type: 'string', default: '', typeOptions: { rows: 3 } },
			{ displayName: 'Slug', name: 'slug', type: 'string', default: '' },
			{ displayName: 'Title', name: 'title', type: 'string', default: '' },
			{ displayName: 'UTM Campaign', name: 'utmCampaign', type: 'string', default: '' },
			{ displayName: 'UTM Content', name: 'utmContent', type: 'string', default: '' },
			{ displayName: 'UTM Medium', name: 'utmMedium', type: 'string', default: '' },
			{ displayName: 'UTM Source', name: 'utmSource', type: 'string', default: '' },
			{ displayName: 'UTM Term', name: 'utmTerm', type: 'string', default: '' },
		],
	},
	{
		displayName: 'Tag ID',
		name: 'tagId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['link'], operation: ['addTag', 'removeTag'] } },
		description: 'Immutable public Bytes Tag ID',
	},
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		options: [
			{ name: 'PNG', value: 'png' },
			{ name: 'SVG', value: 'svg' },
			{ name: 'PDF', value: 'pdf' },
		],
		default: 'png',
		displayOptions: { show: { resource: ['link'], operation: ['getQr'] } },
	},
	{
		displayName: 'PNG Size Target',
		name: 'size',
		type: 'number',
		typeOptions: { minValue: 120, maxValue: 12000 },
		default: 512,
		displayOptions: { show: { resource: ['link'], operation: ['getQr'], format: ['png'] } },
		description: 'Requested PNG raster width in pixels',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: { show: { resource: ['link'], operation: ['getQr'] } },
		description: 'Name of the binary property that will contain the QR file',
	},
];

const tagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['tag'] } },
		options: [{ name: 'List', value: 'list', action: 'List tags' }],
		default: 'list',
	},
];

const activityGroupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['activityGroup'] } },
		options: [
			{ name: 'List', value: 'list', action: 'List activity groups' },
			{ name: 'Resolve', value: 'resolve', action: 'Resolve an activity group' },
		],
		default: 'list',
	},
];

const activityGroupFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['activityGroup'], operation: ['list'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		displayOptions: { show: { resource: ['activityGroup'], operation: ['list'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'activityGroupFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['activityGroup'], operation: ['list'] } },
		options: [
			{ displayName: 'Query', name: 'query', type: 'string', default: '', description: 'Search name, slug or description' },
			{ displayName: 'Status', name: 'status', type: 'options', options: [
				{ name: 'Active', value: 'active' },
				{ name: 'Archived', value: 'archived' },
				{ name: 'Completed', value: 'completed' },
				{ name: 'Draft', value: 'draft' },
				{ name: 'Scheduled', value: 'scheduled' },
			], default: 'active' },
			{ displayName: 'Type', name: 'type', type: 'options', options: [
				{ name: 'Always On', value: 'always_on' },
				{ name: 'Campaign', value: 'campaign' },
				{ name: 'Content', value: 'content' },
				{ name: 'Event', value: 'event' },
				{ name: 'Other', value: 'other' },
				{ name: 'Project', value: 'project' },
			], default: 'campaign' },
		],
	},
	{
		displayName: 'Resolve By',
		name: 'resolveBy',
		type: 'options',
		options: [
			{ name: 'Public ID', value: 'id' },
			{ name: 'Slug', value: 'slug' },
		],
		default: 'id',
		displayOptions: { show: { resource: ['activityGroup'], operation: ['resolve'] } },
	},
	{
		displayName: 'Public ID',
		name: 'activityGroupPublicId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['activityGroup'], operation: ['resolve'], resolveBy: ['id'] } },
	},
	{
		displayName: 'Slug',
		name: 'activityGroupSlug',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['activityGroup'], operation: ['resolve'], resolveBy: ['slug'] } },
	},
];

function createLinkBody(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const additionalFields = context.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;
	return compactObject({
		destination_url: context.getNodeParameter('destinationUrl', itemIndex) as string,
		title: context.getNodeParameter('title', itemIndex, '') as string,
		slug: context.getNodeParameter('slug', itemIndex, '') as string,
		activity_group_id: context.getNodeParameter('activityGroupId', itemIndex, '') as string,
		channel: additionalFields.channel,
		is_active: true,
		notes: additionalFields.notes,
		expires_at: additionalFields.expiresAt,
		utm_source: additionalFields.utmSource,
		utm_medium: additionalFields.utmMedium,
		utm_campaign: additionalFields.utmCampaign,
		utm_term: additionalFields.utmTerm,
		utm_content: additionalFields.utmContent,
	});
}

function createUpdateBody(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const fields = context.getNodeParameter('updateFields', itemIndex, {}) as IDataObject;
	return compactObject({
		destination_url: fields.destinationUrl,
		title: fields.title,
		slug: fields.slug,
		activity_group_id: fields.activityGroupId,
		channel: fields.channel,
		is_active: fields.isActive,
		notes: fields.notes,
		expires_at: fields.expiresAt,
		utm_source: fields.utmSource,
		utm_medium: fields.utmMedium,
		utm_campaign: fields.utmCampaign,
		utm_term: fields.utmTerm,
		utm_content: fields.utmContent,
	});
}

function linkFilters(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const filters = context.getNodeParameter('filters', itemIndex, {}) as IDataObject;
	return compactObject({
		q: filters.query,
		tag_id: filters.tagId,
		tag: filters.tagSlug,
	});
}

function activityGroupFilters(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const filters = context.getNodeParameter('activityGroupFilters', itemIndex, {}) as IDataObject;
	return compactObject({
		q: filters.query,
		status: filters.status,
		type: filters.type,
	});
}

function headerValue(headers: unknown, key: string): unknown {
	if (!headers || typeof headers !== 'object') return undefined;
	const record = headers as Record<string, unknown>;
	return record[key] ?? record[key.toLowerCase()] ?? record[key.toUpperCase()];
}

function firstDataObject(value: unknown): IDataObject | undefined {
	return Array.isArray(value) && value.length > 0 && typeof value[0] === 'object'
		? (value[0] as IDataObject)
		: undefined;
}

export class JawwwsBytes implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Jawwws Bytes',
		name: 'jawwwsBytes',
		icon: { light: 'file:jawwws-bytes.svg', dark: 'file:jawwws-bytes.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create and manage measurable Links, QR files and organisation context in Jawwws Bytes',
		defaults: { name: 'Jawwws Bytes' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'jawwwsBytesApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Activity Group', value: 'activityGroup' },
					{ name: 'Link', value: 'link' },
					{ name: 'Tag', value: 'tag' },
				],
				default: 'link',
			},
			...linkOperations,
			...linkFields,
			...tagOperations,
			...activityGroupOperations,
			...activityGroupFields,
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;

				if (resource === 'link') {
					if (operation === 'create') {
						const response = await bytesApiRequest.call(this, 'POST', '/links', createLinkBody(this, itemIndex));
						returnData.push({ json: response.link as IDataObject, pairedItem: { item: itemIndex } });
					} else if (operation === 'get') {
						const linkId = this.getNodeParameter('linkId', itemIndex) as string;
						const response = await bytesApiRequest.call(this, 'GET', `/links/${encodeURIComponent(linkId)}`);
						returnData.push({ json: response.link as IDataObject, pairedItem: { item: itemIndex } });
					} else if (operation === 'find') {
						const query = (this.getNodeParameter('query', itemIndex) as string).trim();
						const links = await bytesApiRequestAllItems.call(
							this,
							'links',
							'/links',
							{ q: query },
						);
						const match = chooseBestLinkMatch(links, query);

						if (!match) {
							throw new NodeOperationError(
								this.getNode(),
								'No matching Bytes Link was found',
								{ itemIndex },
							);
						}

						returnData.push({ json: match, pairedItem: { item: itemIndex } });
					} else if (operation === 'list') {
						const filters = linkFilters(this, itemIndex);
						const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
						let links: IDataObject[];
						if (returnAll) {
							links = await bytesApiRequestAllItems.call(this, 'links', '/links', filters);
						} else {
							const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
							const response = await bytesApiRequest.call(this, 'GET', '/links', {}, { ...filters, page: 1, per_page: Math.min(limit, 100) });
							links = ((response.links ?? []) as IDataObject[]).slice(0, limit);
						}
						returnData.push(...links.map((link) => ({ json: link, pairedItem: { item: itemIndex } })));
					} else if (operation === 'update') {
						const linkId = this.getNodeParameter('linkId', itemIndex) as string;
						const body = createUpdateBody(this, itemIndex);
						if (Object.keys(body).length === 0) throw new NodeOperationError(this.getNode(), 'Add at least one field to update', { itemIndex });
						const response = await bytesApiRequest.call(this, 'PATCH', `/links/${encodeURIComponent(linkId)}`, body);
						returnData.push({ json: response.link as IDataObject, pairedItem: { item: itemIndex } });
					} else if (operation === 'archive') {
						const linkId = this.getNodeParameter('linkId', itemIndex) as string;
						await bytesApiRequest.call(this, 'DELETE', `/links/${encodeURIComponent(linkId)}`);
						returnData.push({ json: { id: linkId, archived: true }, pairedItem: { item: itemIndex } });
					} else if (operation === 'addTag') {
						const linkId = this.getNodeParameter('linkId', itemIndex) as string;
						const tagId = this.getNodeParameter('tagId', itemIndex) as string;
						await bytesApiRequest.call(this, 'POST', `/links/${encodeURIComponent(linkId)}/tags`, { tag_id: tagId });
						const response = await bytesApiRequest.call(this, 'GET', `/links/${encodeURIComponent(linkId)}`);
						returnData.push({ json: response.link as IDataObject, pairedItem: { item: itemIndex } });
					} else if (operation === 'removeTag') {
						const linkId = this.getNodeParameter('linkId', itemIndex) as string;
						const tagId = this.getNodeParameter('tagId', itemIndex) as string;
						await bytesApiRequest.call(this, 'DELETE', `/links/${encodeURIComponent(linkId)}/tags/${encodeURIComponent(tagId)}`);
						const response = await bytesApiRequest.call(this, 'GET', `/links/${encodeURIComponent(linkId)}`);
						returnData.push({ json: response.link as IDataObject, pairedItem: { item: itemIndex } });
					} else if (operation === 'getQr') {
						const linkId = this.getNodeParameter('linkId', itemIndex) as string;
						const format = this.getNodeParameter('format', itemIndex, 'png') as string;
						const size = format === 'png' ? (this.getNodeParameter('size', itemIndex, 512) as number) : undefined;
						const binaryProperty = this.getNodeParameter('binaryProperty', itemIndex, 'data') as string;
						const response = await bytesApiBinaryRequest.call(this, `/links/${encodeURIComponent(linkId)}/qr`, { format, size });
						const mimeType = normaliseMimeType(headerValue(response.headers, 'content-type'));
						const filename = parseFilename(headerValue(response.headers, 'content-disposition'), `bytes-link-qr.${format}`);
						const binaryData = await this.helpers.prepareBinaryData(Buffer.from(response.body as ArrayBuffer), filename, mimeType);
						returnData.push({
							json: compactObject({
								link_id: linkId,
								filename,
								mime_type: mimeType,
								format,
								target_pixels: normaliseInteger(headerValue(response.headers, 'x-bytes-qr-target-pixels')),
								actual_pixels: normaliseInteger(headerValue(response.headers, 'x-bytes-qr-total-pixels')),
							}),
							binary: { [binaryProperty]: binaryData },
							pairedItem: { item: itemIndex },
						});
					}
				} else if (resource === 'tag' && operation === 'list') {
					const response = await bytesApiRequest.call(this, 'GET', '/tags');
					const tags = (response.tags ?? []) as IDataObject[];
					returnData.push(...tags.map((tag) => ({ json: tag, pairedItem: { item: itemIndex } })));
				} else if (resource === 'activityGroup') {
					if (operation === 'list') {
						const filters = activityGroupFilters(this, itemIndex);
						const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
						let groups: IDataObject[];
						if (returnAll) {
							groups = await bytesApiRequestAllItems.call(this, 'activity_groups', '/activity-groups', filters);
						} else {
							const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
							const response = await bytesApiRequest.call(this, 'GET', '/activity-groups', {}, { ...filters, page: 1, per_page: Math.min(limit, 100) });
							groups = ((response.activity_groups ?? []) as IDataObject[]).slice(0, limit);
						}
						returnData.push(...groups.map((group) => ({ json: group, pairedItem: { item: itemIndex } })));
					} else if (operation === 'resolve') {
						const resolveBy = this.getNodeParameter('resolveBy', itemIndex, 'id') as string;
						const value = resolveBy === 'id'
							? (this.getNodeParameter('activityGroupPublicId', itemIndex) as string)
							: (this.getNodeParameter('activityGroupSlug', itemIndex) as string);
						const response = await bytesApiRequest.call(this, 'GET', '/activity-groups', {}, { [resolveBy]: value, page: 1, per_page: 1 });
						const group = firstDataObject(response.activity_groups);
						if (!group) throw new NodeOperationError(this.getNode(), 'No matching Activity Group was found', { itemIndex });
						returnData.push({ json: group, pairedItem: { item: itemIndex } });
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error instanceof Error ? error.message : 'Unknown Bytes node error' },
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject);
				}
				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error, { itemIndex });
				}
				throw new NodeOperationError(
					this.getNode(),
					error instanceof Error ? error : String(error),
					{ itemIndex },
				);
			}
		}

		return [returnData];
	}
}
