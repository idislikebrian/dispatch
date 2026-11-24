# Dispatch migration release workflow

schema changes are explicit Prisma migrations. production does not use `prisma db push`, `prisma migrate dev`, reset, or implicit schema synchronization.

## release sequence

1. add and review a timestamped directory under `prisma/migrations/`.
2. run `npm run migration:check` against the protected staging or production runner credential. it validates migration naming, non-empty SQL, forbidden commands, and that Prisma reports the database current.
3. run `npm run migration:deploy` from the authorized deployment runner. it creates a custom-format backup with mode `0600`, runs `prisma migrate deploy`, and verifies status afterward.
4. promote the application only after the migration check and application build pass.
5. if verification fails, retain the backup and stop. do not use destructive synchronization as recovery.

the GitHub migration guard uses the `DISPATCH_MIGRATION_DATABASE_URL` secret and runs on migration-related pull requests or manual dispatch. the secret is never printed or committed.
