import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class JawwwsBytesApi implements ICredentialType {
	name = 'jawwwsBytesApi';

	displayName = 'Jawwws Bytes API';

	icon: Icon = {
		light: 'file:../nodes/JawwwsBytes/jawwws-bytes.svg',
		dark: 'file:../nodes/JawwwsBytes/jawwws-bytes.dark.svg',
	};

	documentationUrl = 'https://developer.jaww.ws/developer-api/';

	properties: INodeProperties[] = [
		{
			displayName: 'Workspace API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Create a workspace API key in Bytes under Workspace Settings > Developer API',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.jaww.ws/api/v1',
			url: '/links',
			method: 'GET',
			qs: {
				page: 1,
				per_page: 1,
			},
		},
	};
}
