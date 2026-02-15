import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { Config } from "./config";
import { APIError, AuthenticationError, RateLimitError } from "./errors";

export class HTTPClient {
  private axiosInstance: AxiosInstance;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.config.get("baseURL"),
      timeout: this.config.get("timeout"),
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.get("apiKey")}`,
        "User-Agent": `nodela-sdk/${process.version}`,
      },
    });
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        return this.handleError(error);
      }
    );
  }

  private async handleError(error: AxiosError): Promise<never> {
    if (!error.response) {
      throw new APIError('Network error occurred', 0, { originalError: error.message });
    }

    const { status, data } = error.response;

    switch (status) {
      case 401: {
        const errorData = data as Record<string, unknown>;
        throw new AuthenticationError(
          (typeof errorData?.message === 'string' ? errorData.message : undefined) || 'Invalid API key or unauthorized access'
        );
      }
      case 429: {
        const retryAfter = error.response.headers['retry-after'];
        throw new RateLimitError(
          'Rate limit exceeded',
          retryAfter ? parseInt(retryAfter) : undefined
        );
      }
      default:
        throw APIError.fromResponse(status, data);
    }
  }

  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.request(config);
    return response.data;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }
}