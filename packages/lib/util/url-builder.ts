export class UrlBuilder {
	private baseUrl: string;
	private pathSegments: string[];
	private queryParams: URLSearchParams;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl.replace(/\/+$/, '');
		this.pathSegments = [];
		this.queryParams = new URLSearchParams();
	}

	addPathSegment(segment: string): UrlBuilder {
		this.pathSegments.push(segment);
		return this;
	}

	addQueryParam(key: string, value: string): UrlBuilder {
		this.queryParams.append(key, value);
		return this;
	}

	addQueryParams(queries: [string, string][] = []): UrlBuilder {
		for (const query of queries) {
			this.queryParams.append(query[0], query[1]);
		}
		return this;
	}

	toString(): string {
		const path = this.pathSegments.join('/');
		const queryString = this.queryParams.toString();

		const fullPath = path ? `${this.baseUrl}/${path}` : this.baseUrl;

		return `${fullPath}${queryString ? '?' + queryString : ''}`;
	}
}
