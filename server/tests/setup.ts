import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_min_32_characters_long_for_unit_tests';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/discord_dashboard_test?sslmode=disable';
