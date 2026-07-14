import { Pool } from 'pg';

import { applyOpportunityMigrations } from './migrations';
import { OpportunityRepository } from './repository';
import { seedMikeStarterWatches } from './seed';

let opportunityPool: Pool | null = null;
let initialization: Promise<void> | null = null;

export function getOpportunityPool(): Pool {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('Opportunity data is not configured.');
  if (!opportunityPool) {
    opportunityPool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000 });
  }
  return opportunityPool;
}

export async function initializeOpportunityCore(): Promise<OpportunityRepository> {
  const pool = getOpportunityPool();
  initialization ??= (async () => {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
  })();
  try {
    await initialization;
  } catch (error) {
    initialization = null;
    throw error;
  }
  return new OpportunityRepository(pool);
}
