/**
 * Performance Benchmarking Utilities
 * Separated from JSX file to avoid TypeScript generic conflicts
 */

export interface BenchmarkOptions {
  iterations?: number;
  warmupRuns?: number;
  logResults?: boolean;
}

export interface BenchmarkResult {
  name: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
  totalTime: number;
}

export const benchmark = async <T>(
  name: string, 
  fn: () => Promise<T> | T,
  options: BenchmarkOptions = {}
): Promise<{ result: T; benchmark: BenchmarkResult }> => {
  const { iterations = 5, warmupRuns = 2, logResults = __DEV__ } = options;
  
  // Warmup runs
  for (let i = 0; i < warmupRuns; i++) {
    await fn();
  }
  
  const times: number[] = [];
  let result: T;
  
  // Actual benchmark runs
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    result = await fn();
    const end = performance.now();
    times.push(end - start);
  }
  
  const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const totalTime = times.reduce((sum, time) => sum + time, 0);
  
  const benchmarkResult: BenchmarkResult = {
    name,
    averageTime,
    minTime,
    maxTime,
    iterations,
    totalTime,
  };
  
  if (logResults) {
    console.log(`📊 Benchmark "${name}":`, {
      average: `${averageTime.toFixed(2)}ms`,
      min: `${minTime.toFixed(2)}ms`,
      max: `${maxTime.toFixed(2)}ms`,
      iterations,
    });
  }
  
  return { result: result!, benchmark: benchmarkResult };
};