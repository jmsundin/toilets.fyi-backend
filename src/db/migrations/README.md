# Database Migrations

This directory contains database migration scripts that should be run when making schema changes.

## Running Migrations

### Using DATABASE_URL (Recommended)
If you have the DATABASE_URL environment variable set:

### Using Direct Connection
If you need to specify database credentials directly:

## Migration History

### 01_update_id_column.sql
- **Date**: [Current Date]
- **Description**: Changes the `id` column from SERIAL to INTEGER to match the Refuge Restrooms API IDs
- **Changes**:
  - Creates temporary table with new schema
  - Migrates existing data
  - Drops old table
  - Renames new table
  - Recreates indexes

## Best Practices

1. **Always backup your database before running migrations**
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test migrations in development first**
   ```bash
   psql $DEV_DATABASE_URL -f src/db/migrations/your_migration.sql
   ```

3. **Naming convention**
   - Prefix files with sequential numbers: `01_`, `02_`, etc.
   - Use descriptive names: `update_id_column.sql`, `add_user_table.sql`

4. **If something goes wrong**
   To restore from backup:
   ```bash
   psql $DATABASE_URL < your_backup_file.sql
   ```

## Future Migrations

When creating new migrations:
1. Create a new SQL file in this directory
2. Follow the naming convention: `XX_descriptive_name.sql`
3. Document the changes in this README
4. Test in development environment first
5. Backup production database
6. Run the migration in production
