#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/5a1f8271ccc6978364cf6a6b451bd1c0cd925de1de19ad0d8644547282a09313/contract';
import startContract from '../../snapshots/5a1f8271ccc6978364cf6a6b451bd1c0cd925de1de19ad0d8644547282a09313/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8aaf4184eea0a4d5b8214d18f089c278f9230a17f1a185a525dd1e38633cff45/contract';
import endContract from '../../snapshots/8aaf4184eea0a4d5b8214d18f089c278f9230a17f1a185a525dd1e38633cff45/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'serviceRequest',
        columns: [
          col('activities', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('alternatePhone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('authorization', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('days', 'text[]', { notNull: true, codecRef: { codecId: 'pg/text@1', many: true } }),
          col('department', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fullName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('hoursPerDay', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('municipality', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'serviceRequest_activities_elem_not_null_078e4c08',
            'array_position("activities", NULL) IS NULL',
          ),
          checkExpression(
            'serviceRequest_days_elem_not_null_b975257c',
            'array_position("days", NULL) IS NULL',
          ),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'serviceRequest',
        index: 'serviceRequest_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
