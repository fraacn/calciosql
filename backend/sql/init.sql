-- ============================================
-- CALCIO SQL - Initialization Script
-- This script is executed when the database is first created
-- ============================================

-- Create database (if running directly)
-- CREATE DATABASE calcio_sql;

-- Connect to database (uncomment if needed)
-- \c calcio_sql;

-- Run schema creation
\i /docker-entrypoint-initdb.d/01_schema.sql

-- Run data insertion
\i /docker-entrypoint-initdb.d/02_data.sql

-- Grant privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO calcio_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO calcio_user;

-- Success message
\echo '✅ Database calcio_sql initialized successfully!'
\echo '📋 Tables created: squadre_iscritte, giocatori, squadra_giocatori, partite, timeline_partita'
\echo '👥 Sample players loaded'
\echo '🎮 Ready to play Calcio SQL!'
