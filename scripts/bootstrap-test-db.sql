SELECT 'CREATE DATABASE repuchain_test OWNER repuchain'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'repuchain_test') \gexec
