-- Local development only. Creates missing resources; does not reset existing roles or data.
SELECT 'CREATE ROLE repuchain LOGIN PASSWORD ''repuchain_local_only'''
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'repuchain') \gexec
SELECT 'CREATE DATABASE repuchain OWNER repuchain'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'repuchain') \gexec
