#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5a1f8271ccc6978364cf6a6b451bd1c0cd925de1de19ad0d8644547282a09313/contract';
import endContract from '../../snapshots/5a1f8271ccc6978364cf6a6b451bd1c0cd925de1de19ad0d8644547282a09313/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/5dd10368119005a27582c1cad1520dc85b2358c2c1aa194b1ece2b27468f8d07/contract';
import startContract from '../../snapshots/5dd10368119005a27582c1cad1520dc85b2358c2c1aa194b1ece2b27468f8d07/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'client',
        column: col('activityPreferences', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
