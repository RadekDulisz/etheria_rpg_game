/* eslint-disable no-console */
const autocannon = require('autocannon');

function runLoadTest(url, connections, durationSeconds, overallRate) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url,
        method: 'GET',
        connections,
        duration: durationSeconds,
        pipelining: 1,
        timeout: 10,
        ...(overallRate ? { overallRate } : {}),
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );

    autocannon.track(instance, { renderProgressBar: true, renderResultsTable: true });
  });
}

function resolveP95(latency) {
  if (!latency || typeof latency !== 'object') {
    return null;
  }

  if (typeof latency.p95 === 'number') {
    return latency.p95;
  }

  const percentiles = latency.percentiles;
  if (percentiles && typeof percentiles === 'object') {
    if (typeof percentiles['95'] === 'number') {
      return percentiles['95'];
    }
    if (typeof percentiles[95] === 'number') {
      return percentiles[95];
    }
  }

  return null;
}

async function main() {
  const baseUrl = process.env.LOADTEST_BASE_URL || 'http://localhost:3000';
  const endpoint = process.env.LOADTEST_ENDPOINT || '/health';
  const connections = Number(process.env.LOADTEST_CONNECTIONS || 30);
  const durationSeconds = Number(process.env.LOADTEST_DURATION_SECONDS || 20);
  const overallRate = Number(process.env.LOADTEST_OVERALL_RATE || 1);
  const url = `${baseUrl}${endpoint}`;

  if (!Number.isFinite(connections) || connections < 1) {
    throw new Error('LOADTEST_CONNECTIONS must be a positive integer.');
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds < 1) {
    throw new Error('LOADTEST_DURATION_SECONDS must be a positive integer.');
  }
  if (!Number.isFinite(overallRate) || overallRate < 1) {
    throw new Error('LOADTEST_OVERALL_RATE must be a positive integer.');
  }

  console.log(`Starting smoke load test for ${url}`);
  console.log(`Connections: ${connections}, duration: ${durationSeconds}s, overallRate: ${overallRate} req/s`);

  const result = await runLoadTest(url, connections, durationSeconds, overallRate);
  const latencyP95 = resolveP95(result.latency);

  console.log('\nSummary (copy to docs):');
  console.log(`- requests.average: ${result.requests.average}`);
  console.log(`- requests.mean: ${result.requests.mean}`);
  console.log(`- latency.p95: ${latencyP95 ?? 'n/a'} ms`);
  console.log(`- latency.average: ${result.latency.average} ms`);
  console.log(`- errors: ${result.errors}`);
  console.log(`- timeouts: ${result.timeouts}`);

  if (result.errors > 0 || result.timeouts > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});