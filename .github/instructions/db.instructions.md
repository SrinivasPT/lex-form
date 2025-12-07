---
applyTo: 'db/**/*.sql'
---

# DB (SQL Server) Conventions

-   Use `dbo` schema and `USE <db>` + `GO` at the top of scripts.
-   Table names: singular, snake_case: `employee`, `employee_address`, `employee_dependent`.
-   Column names: snake_case — `first_name`, `date_of_birth`.
-   Strings: `NVARCHAR`; big JSON: `NVARCHAR(MAX)`; bools: `BIT`; identifiers: `UNIQUEIDENTIFIER DEFAULT NEWID()`; system version: `DATETIME2(7)`.
-   Temporal tables: `PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time)` and `HISTORY_TABLE = dbo.<table>_history`.
-   Always disable system-versioning before dropping a base table.

## Utility SPs (from `db/util.sql`) — assume installed

-   `sp_safe_drop_table(schema, table)` — disables versioning (if present), drops history, then base table.
-   `sp_drop_index_if_exists(schema, table, index)` — drop index if exists.
-   `sp_disable_system_versioning(schema, table)` — disables system versioning if enabled.

## Best practices

-   Use `EXEC dbo.sp_safe_drop_table 'dbo', 'employee';` for drops.
-   Guard creation with `IF OBJECT_ID('dbo.table','U') IS NULL`.
-   Use `sp_drop_index_if_exists` before creating an index; create indexes only if the table exists.
-   Name FK constraints `fk_<child>_<parent>`, indexes `idx_<table>_<col>`.
