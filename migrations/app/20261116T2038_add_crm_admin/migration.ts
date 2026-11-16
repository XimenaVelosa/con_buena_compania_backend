#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4dfb47d7aa40067400a27eef9b4a72923f2c5ac970732bda61a88f8d303d6144/contract';
import startContract from '../../snapshots/4dfb47d7aa40067400a27eef9b4a72923f2c5ac970732bda61a88f8d303d6144/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f228a003e95d96719122fa91c7f8ff4800334b6633208e51ad9c145721e8166f/contract';
import endContract from '../../snapshots/f228a003e95d96719122fa91c7f8ff4800334b6633208e51ad9c145721e8166f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'adminSession',
        columns: [
          col('expiresAt', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'adminUser',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('displayName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('failedLoginAttempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('lockedUntil', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('mustChangePassword', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('admin'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('username', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'adminSession',
        constraint: 'adminSession_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'adminUser',
        constraint: 'adminUser_username_key',
        columns: ['username'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'adminSession',
        index: 'adminSession_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'adminSession',
        foreignKey: {
          name: 'adminSession_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'adminUser', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
