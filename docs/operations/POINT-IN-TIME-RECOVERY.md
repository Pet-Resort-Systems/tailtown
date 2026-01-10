# Point-in-Time Recovery (PITR) Setup

PostgreSQL WAL (Write-Ahead Logging) archiving enables point-in-time recovery.

## Prerequisites

- PostgreSQL 14+
- S3 bucket or local storage for WAL archives
- `pg_basebackup` and `pg_restore` tools

## Configuration

### 1. Enable WAL Archiving in postgresql.conf

```conf
# Enable WAL archiving
wal_level = replica
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'

# For S3 archiving (requires aws cli):
# archive_command = 'aws s3 cp %p s3://tailtown-backups/wal/%f'

# Keep enough WAL for recovery
max_wal_senders = 3
wal_keep_size = 1GB
```

### 2. Create Base Backup

```bash
# Create base backup directory
mkdir -p /var/lib/postgresql/backups

# Take base backup
pg_basebackup -D /var/lib/postgresql/backups/base_$(date +%Y%m%d) \
  -Ft -z -P -U postgres

# For Docker:
docker exec tailtown-postgres pg_basebackup \
  -D /backups/base_$(date +%Y%m%d) -Ft -z -P -U postgres
```

### 3. Schedule Daily Base Backups

Add to crontab:

```bash
# Daily base backup at 2 AM
0 2 * * * /scripts/database/base-backup.sh >> /var/log/pg_backup.log 2>&1
```

## Recovery Process

### Recover to Specific Point in Time

1. **Stop PostgreSQL**

```bash
docker stop tailtown-postgres
```

2. **Restore base backup**

```bash
# Clear data directory
rm -rf /var/lib/postgresql/data/*

# Extract base backup
tar -xzf /backups/base_20250110.tar.gz -C /var/lib/postgresql/data/
```

3. **Create recovery.signal and configure recovery**

```bash
touch /var/lib/postgresql/data/recovery.signal

cat >> /var/lib/postgresql/data/postgresql.conf << EOF
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_time = '2025-01-10 14:30:00'
recovery_target_action = 'promote'
EOF
```

4. **Start PostgreSQL**

```bash
docker start tailtown-postgres
```

PostgreSQL will replay WAL files until the target time.

## Retention Policy

| Backup Type       | Retention |
| ----------------- | --------- |
| Base backups      | 7 days    |
| WAL archives      | 7 days    |
| Monthly snapshots | 12 months |

## Verification

### Test Recovery Monthly

1. Restore to a test database
2. Verify data integrity
3. Document recovery time

```bash
# Test recovery script
./scripts/database/test-recovery.sh
```

## Monitoring

Check WAL archiving status:

```sql
SELECT * FROM pg_stat_archiver;
```

Check replication lag:

```sql
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS send_lag,
       pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn) AS flush_lag
FROM pg_stat_replication;
```

## Emergency Contacts

- Database Admin: [Configure in .env]
- AWS Support: [If using S3]
