import { sql } from '@vercel/postgres';

export async function testConnection() {
    try {
        const result = await sql`SELECT 1`;
        return result.rows[0];
    } catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
}

export { sql };
