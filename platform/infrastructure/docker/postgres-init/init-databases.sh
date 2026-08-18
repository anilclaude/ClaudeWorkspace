#!/bin/bash
# Runs once, on first boot of an empty Postgres data directory.
#
# One shared database, one shared schema, for every backend service —
# not one database per service. Each service is still a separately
# deployable NestJS process; they just read/write the same physical
# database. Data privacy between services (CLAUDE.md non-negotiable #5)
# is enforced by code review now, not by infrastructure — see
# scaffold/policies/agent-policies.md's X5 for what that means in practice.
set -e

for db in platform_db platform_test_db; do
  echo "Creating database: $db"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
    SELECT 'CREATE DATABASE $db' WHERE NOT EXISTS (
      SELECT FROM pg_database WHERE datname = '$db'
    )\gexec
EOSQL
done
