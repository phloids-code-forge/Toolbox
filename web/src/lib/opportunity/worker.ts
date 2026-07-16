import { evaluateListingAgainstWatch } from './matching';
import type {
  ListingInput,
  OpportunityRepository,
  SourceRunRecord,
  WorkerRunStatus,
} from './repository';

export type SourceAdapter = {
  sourceType: string;
  poll: () => Promise<ListingInput[]>;
};

export type WorkerResult = {
  runId: string;
  status: WorkerRunStatus;
  counts: Record<string, number>;
  sourceResults: SourceRunRecord[];
  reused: boolean;
};

type RunWorkerInput = {
  repository: OpportunityRepository;
  clientSlug: string;
  runKey: string;
  runType?: 'fixture' | 'scheduled';
  adapters: SourceAdapter[];
  now?: Date;
};

function safeErrorSummary(error: unknown): string {
  void error;
  return 'source_processing_failed';
}

function assertValidListing(listing: ListingInput): void {
  const boundedText = (value: string, max: number): boolean => {
    const length = value.trim().length;
    return length > 0 && length <= max;
  };
  const optionalText = (value: string | null, max: number): boolean => (
    value === null || value.length <= max
  );
  const integerInRange = (value: number | null, min: number, max: number): boolean => (
    value === null || (Number.isInteger(value) && value >= min && value <= max)
  );
  let validSourceUrl = listing.sourceUrl === null;
  if (listing.sourceUrl !== null && listing.sourceUrl.length <= 2_048) {
    try {
      validSourceUrl = ['http:', 'https:'].includes(new URL(listing.sourceUrl).protocol);
    } catch {
      validSourceUrl = false;
    }
  }

  const valid = boundedText(listing.canonicalKey, 240)
    && boundedText(listing.sourceType, 80)
    && boundedText(listing.sourceItemId, 200)
    && boundedText(listing.title, 300)
    && validSourceUrl
    && integerInRange(listing.year, 1900, new Date().getUTCFullYear() + 2)
    && optionalText(listing.make, 120)
    && optionalText(listing.model, 120)
    && optionalText(listing.trim, 120)
    && (listing.priceAmount === null
      || (Number.isFinite(listing.priceAmount) && listing.priceAmount >= 0 && listing.priceAmount <= 10_000_000))
    && integerInRange(listing.mileage, 0, 2_000_000)
    && ['clean', 'salvage', 'rebuilt', 'unknown'].includes(listing.titleStatus)
    && optionalText(listing.locationText, 200)
    && integerInRange(listing.distanceMiles, 0, 100_000)
    && (
      listing.duplicateIdentity === undefined
      || (
        boundedText(listing.duplicateIdentity.type, 64)
        && boundedText(listing.duplicateIdentity.value, 200)
      )
    );
  if (!valid) throw new Error('Listing input failed validation.');
}

export async function runOpportunityWorker({
  repository,
  clientSlug,
  runKey,
  runType = 'fixture',
  adapters,
  now = new Date(),
}: RunWorkerInput): Promise<WorkerResult> {
  const run = await repository.startWorkerRun(clientSlug, runKey, now, runType);
  if (run.reused) {
    return {
      runId: run.id,
      status: run.status,
      counts: run.counts,
      sourceResults: await repository.getSourceResults(clientSlug, run.id),
      reused: true,
    };
  }

  const counts = {
    fetched: 0,
    normalized: 0,
    listings: 0,
    matches: 0,
    alertsSkipped: 0,
    failedSources: 0,
  };
  const countedMatches = new Set<string>();
  const sourceResults: SourceRunRecord[] = [];
  let watches;
  try {
    watches = await repository.listActiveMatchWatches(clientSlug);
  } catch (error) {
    const errorSummary = safeErrorSummary(error);
    await repository.finishWorkerRun(clientSlug, run.id, 'failed', counts, errorSummary, now);
    return {
      runId: run.id,
      status: 'failed',
      counts,
      sourceResults,
      reused: false,
    };
  }

  for (const adapter of adapters) {
    const sourceCounts = { fetched: 0, normalized: 0, failed: 0 };
    let errorSummary: string | null = null;
    let listings: ListingInput[] = [];
    try {
      listings = await adapter.poll();
      sourceCounts.fetched = listings.length;
      counts.fetched += listings.length;
    } catch (error) {
      sourceCounts.failed += 1;
      errorSummary = safeErrorSummary(error);
    }

    for (const input of listings) {
      try {
        assertValidListing(input);
        sourceCounts.normalized += 1;
        counts.normalized += 1;
        const itemCounts = await repository.withTransaction(async (transactionalRepository) => {
          const sourceRecordId = await transactionalRepository.upsertSourceRecord(
            clientSlug,
            input,
            now,
          );
          const listing = await transactionalRepository.upsertListing(
            clientSlug,
            input,
            now,
            sourceRecordId,
          );
          let decisionListingId = listing.id;
          let decisionScopeId = listing.id;
          if (input.duplicateIdentity) {
            const duplicateGroup = await transactionalRepository.linkDuplicateIdentity(
              clientSlug,
              listing.id,
              input.duplicateIdentity.type,
              input.duplicateIdentity.value,
              now,
            );
            decisionListingId = duplicateGroup.representativeListingId;
            decisionScopeId = duplicateGroup.id;
          }
          await transactionalRepository.recordSighting(clientSlug, listing.id, run.id, now);
          let matches = 0;
          let alertsSkipped = 0;
          const matchKeys: string[] = [];
          for (const watch of watches) {
            const evaluation = evaluateListingAgainstWatch(watch, listing);
            if (decisionListingId === listing.id) {
              await transactionalRepository.upsertMatch(clientSlug, listing.id, watch.id, evaluation);
            } else {
              await transactionalRepository.reconcileMatch(clientSlug, listing.id, watch.id, evaluation);
            }
            if (evaluation.accepted) {
              const matchKey = `${decisionScopeId}:${watch.id}`;
              if (!countedMatches.has(matchKey)) {
                matches += 1;
                matchKeys.push(matchKey);
              }
              const alertRecorded = await transactionalRepository.recordSkippedAlert(
                clientSlug,
                listing.id,
                watch.id,
              );
              if (alertRecorded) alertsSkipped += 1;
            }
          }
          await transactionalRepository.checkpointWorkerRun(clientSlug, run.id, {
            ...counts,
            listings: counts.listings + 1,
            matches: counts.matches + matches,
            alertsSkipped: counts.alertsSkipped + alertsSkipped,
          });
          return { matches, alertsSkipped, matchKeys };
        });
        for (const matchKey of itemCounts.matchKeys) countedMatches.add(matchKey);
        counts.listings += 1;
        counts.matches += itemCounts.matches;
        counts.alertsSkipped += itemCounts.alertsSkipped;
      } catch (error) {
        sourceCounts.failed += 1;
        errorSummary ??= safeErrorSummary(error);
      }
    }

    if (sourceCounts.failed > 0) counts.failedSources += 1;
    await repository.checkpointWorkerRun(clientSlug, run.id, counts);
    const result: SourceRunRecord = {
      sourceType: adapter.sourceType,
      status: sourceCounts.failed > 0 ? 'failed' : 'ok',
      counts: sourceCounts,
      errorSummary,
    };
    await repository.recordSourceResult(clientSlug, run.id, result);
    sourceResults.push(result);
  }

  const successfulSources = sourceResults.filter((result) => result.status === 'ok').length;
  const completedAnyWork = successfulSources > 0 || counts.listings > 0;
  const status: WorkerRunStatus =
    counts.failedSources === 0 ? 'ok' : completedAnyWork ? 'partial' : 'failed';
  const errorSummary = counts.failedSources > 0 ? `${counts.failedSources} source adapter failed.` : null;
  await repository.finishWorkerRun(clientSlug, run.id, status, counts, errorSummary, now);

  return {
    runId: run.id,
    status,
    counts,
    sourceResults,
    reused: false,
  };
}
