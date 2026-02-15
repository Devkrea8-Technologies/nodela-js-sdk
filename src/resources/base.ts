import { HTTPClient } from "../client";

export abstract class BaseResource {
  protected client: HTTPClient;
  protected basePath: string;

  constructor(client: HTTPClient, basePath: string) {
    this.client = client;
    this.basePath = basePath;
  }

  protected buildPath(...segments: (string | number)[]): string {
    return [this.basePath, ...segments].join("/")
  }

  protected buildQueryString(params?: Record<string, unknown> | object): string {
    if (!params) return '';

    const queryString = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    
    return queryString ? `?${queryString}` : '';
  }
}