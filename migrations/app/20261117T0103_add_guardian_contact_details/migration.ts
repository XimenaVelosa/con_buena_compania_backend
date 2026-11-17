#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/43c053d19341cec2d634f8a9e8bbe7585dba23b27565f8dffd8e45855377c005/contract';
import endContract from '../../snapshots/43c053d19341cec2d634f8a9e8bbe7585dba23b27565f8dffd8e45855377c005/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f228a003e95d96719122fa91c7f8ff4800334b6633208e51ad9c145721e8166f/contract';
import startContract from '../../snapshots/f228a003e95d96719122fa91c7f8ff4800334b6633208e51ad9c145721e8166f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'client',
        column: col('guardianAddress', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'client',
        column: col('guardianIdNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'client',
        column: col('guardianPhone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
