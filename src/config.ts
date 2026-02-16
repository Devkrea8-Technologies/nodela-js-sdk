export interface SDKConfig {
  apiKey: string;
  baseURL: string;
  timeout?: number;
  maxRetries?: number;
  environment?: 'production' | 'sandbox';
}

export interface SDKConfigOptions {
  timeout?: number;
  maxRetries?: number;
  environment?: 'production' | 'sandbox';
}

export class Config {
  private config: Required<SDKConfig>;

  constructor(apiKey: string, options?: SDKConfigOptions) {
    this.validateApiKey(apiKey);

    if (options) {
      this.validateOptions(options);
    }

    this.config = {
      apiKey,
      baseURL: 'https://api.nodela.co',
      timeout: options?.timeout ?? 5000,
      maxRetries: options?.maxRetries ?? 3,
      environment: options?.environment ?? 'production',
    };
  }

  private validateApiKey(apiKey: string) {
    if (
      !apiKey ||
      typeof apiKey !== 'string' ||
      apiKey.trim() === '' ||
      !this.isNodelaApiKey(apiKey)
    ) {
      throw new Error('Invalid API key provided. Please provide a valid API key.');
    }
  }

  private isNodelaApiKey(apiKey: string): boolean {
    return apiKey.startsWith('nk_test_') || apiKey.startsWith('nk_live_');
  }

  private validateOptions(options: SDKConfigOptions) {
    if (
      options.timeout !== undefined &&
      (typeof options.timeout !== 'number' || options.timeout <= 0)
    ) {
      throw new Error('Invalid timeout value. Timeout must be a positive number.');
    }
    if (
      options.maxRetries !== undefined &&
      (typeof options.maxRetries !== 'number' || options.maxRetries < 0)
    ) {
      throw new Error('Invalid maxRetries value. maxRetries must be a non-negative number.');
    }
    if (
      options.environment !== undefined &&
      !['production', 'sandbox'].includes(options.environment)
    ) {
      throw new Error(
        'Invalid environment value. Environment must be either "production" or "sandbox".'
      );
    }
  }

  get<K extends keyof Required<SDKConfig>>(key: K): Required<SDKConfig>[K] {
    return this.config[key];
  }

  getAll(): Required<SDKConfig> {
    return { ...this.config };
  }
}
