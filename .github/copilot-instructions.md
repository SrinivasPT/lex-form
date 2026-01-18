# Repository: LexForm — Code & DB Conventions (Crisp)

This file contains short, actionable conventions for writing code in this repository. Keep it crisp and minimal — follow these to stay consistent.

Path-specific instructions:

- DB (SQL Server): See `.github/instructions/db.instructions.md`
- Angular (Frontend): See `.github/instructions/angular.instructions.md`
- Backend (Node.js): See `.github/instructions/backend.instructions.md`

CI / Script order

- Ensure `db/util.sql` is applied before schema scripts that use utility SPs.
- Typical order: `db/util.sql` -> `db/1.0.schema.sql` -> `db/1.1.*.sql`.

If you want a stricter enforcement, we can add a simple SQL linter in CI to verify table names, use of SPs, and presence of `ISJSON` checks.

Keep it clean and consistent — small scripts and conventions scale nicely.

# Terminal uses PowerShell conventions

When writing scripts or commands in documentation, use PowerShell conventions:

- Use `Get-ChildItem` instead of `ls` or `dir`.
- Use `Copy-Item` instead of `cp`.
- Use `Remove-Item` instead of `rm` or `del`.
- Use `ForEach-Object` instead of `foreach`.
