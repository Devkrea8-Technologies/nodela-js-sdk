import { Config, SDKConfigOptions } from './config';
import { HTTPClient } from './client';
import { Transactions } from './resources/Transactions';
import { Invoices } from './resources/Invoices';

export * from './errors';

export class Nodela {
  private config: Config;
  private client: HTTPClient;

  public readonly transactions: Transactions;
  public readonly invoices: Invoices;

  constructor(apiKey: string, options?: SDKConfigOptions) {
    this.config = new Config(apiKey, options);
    this.client = new HTTPClient(this.config);

    this.transactions = new Transactions(this.client);
    this.invoices = new Invoices(this.client);
  }

  getConfig(): ReturnType<Config['getAll']> {
    return this.config.getAll();
  }
}

export default Nodela;
