/**
 * Analysis Engine - Advanced statistical and trend analysis utilities
 */

import { StatisticsResult, TimeSeriesPoint, Trend, WeightedFactor } from "../types";

export class AnalysisEngine {
  /**
   * Calculate basic statistics for a dataset
   */
  static getStats(data: number[]): StatisticsResult {
    if (!data || data.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, count: 0 };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const sum = data.reduce((acc, val) => acc + val, 0);
    const mean = sum / data.length;
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const variance =
      data.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / data.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean: parseFloat(mean.toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2)),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: data.length,
    };
  }

  /**
   * Detect trend in a time-series dataset
   */
  static detectTrend(data: TimeSeriesPoint[], timeKey: string = "timestamp", valueKey: string = "value"): Trend {
    if (data.length < 3) return Trend.STABLE;

    const sortedData = [...data].sort(
      (a, b) => new Date(a[timeKey as keyof TimeSeriesPoint] as string).getTime() -
                new Date(b[timeKey as keyof TimeSeriesPoint] as string).getTime()
    );
    const values = sortedData.map((d) => d[valueKey as keyof TimeSeriesPoint] as number);

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.ceil(values.length / 2));

    const firstMean = this.getStats(firstHalf).mean;
    const secondMean = this.getStats(secondHalf).mean;

    const threshold = this.getStats(values).stdDev * 0.25;

    if (secondMean > firstMean + threshold) {
      return Trend.IMPROVING;
    }
    if (secondMean < firstMean - threshold) {
      return Trend.DECLINING;
    }
    return Trend.STABLE;
  }

  /**
   * Identify anomalies (outliers) in a dataset using standard deviation
   */
  static findAnomalies(data: number[], sensitivity: number = 2): number[] {
    if (data.length < 5) return [];
    const { mean, stdDev } = this.getStats(data);
    const lowerBound = mean - stdDev * sensitivity;
    const upperBound = mean + stdDev * sensitivity;

    return data.filter((value) => value < lowerBound || value > upperBound);
  }

  /**
   * Calculate a weighted score based on multiple factors
   */
  static calculateWeightedScore(factors: WeightedFactor[]): number {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const factor of factors) {
      const { value, weight, max = 100 } = factor;
      if (weight > 0) {
        totalWeight += weight;
        const normalizedValue = (value / max) * 100;
        weightedSum += normalizedValue * weight;
      }
    }

    if (totalWeight === 0) return 0;

    const score = weightedSum / totalWeight;
    return Math.max(0, Math.min(100, parseFloat(score.toFixed(2))));
  }

  /**
   * Perform correlation analysis between two datasets
   */
  static getCorrelation(data1: number[], data2: number[]): number {
    if (data1.length !== data2.length || data1.length === 0) {
      return 0;
    }

    const n = data1.length;
    const sum1 = data1.reduce((a, b) => a + b, 0);
    const sum2 = data2.reduce((a, b) => a + b, 0);
    const sum1Sq = data1.reduce((a, b) => a + b * b, 0);
    const sum2Sq = data2.reduce((a, b) => a + b * b, 0);
    const pSum = data1.reduce((sum, val, i) => sum + val * data2[i], 0);

    const num = pSum - (sum1 * sum2) / n;
    const den = Math.sqrt(
      (sum1Sq - Math.pow(sum1, 2) / n) * (sum2Sq - Math.pow(sum2, 2) / n)
    );

    if (den === 0) return 0;

    return parseFloat((num / den).toFixed(2));
  }

  /**
   * Normalize a dataset to a 0-100 scale
   */
  static normalize(data: number[]): number[] {
    if (data.length === 0) return [];
    const { min, max } = this.getStats(data);
    if (max - min === 0) return data.map(() => 50);

    return data.map((value) =>
      parseFloat((((value - min) / (max - min)) * 100).toFixed(2))
    );
  }

  /**
   * Generate a forecast using simple linear regression
   */
  static forecast(data: number[], periods: number = 3): number[] {
    if (data.length < 2) return [];

    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i + 1);
    const y = data;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0);
    const sumXX = x.map((xi) => xi * xi).reduce((a, b) => a + b, 0);

    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return [];

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    const forecastValues: number[] = [];
    for (let i = 1; i <= periods; i++) {
      const futureX = n + i;
      const forecastValue = slope * futureX + intercept;
      forecastValues.push(parseFloat(forecastValue.toFixed(2)));
    }

    return forecastValues;
  }

  /**
   * Calculate percentage change between two values
   */
  static percentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return parseFloat((((newValue - oldValue) / oldValue) * 100).toFixed(2));
  }

  /**
   * Calculate moving average
   */
  static movingAverage(data: number[], window: number = 3): number[] {
    if (data.length < window) return [];

    const result: number[] = [];
    for (let i = window - 1; i < data.length; i++) {
      const slice = data.slice(i - window + 1, i + 1);
      const avg = slice.reduce((a, b) => a + b, 0) / window;
      result.push(parseFloat(avg.toFixed(2)));
    }
    return result;
  }

  /**
   * Group data by a time period (month, week, etc.)
   */
  static groupByMonth<T extends { [key: string]: unknown }>(
    data: T[],
    dateKey: keyof T,
    valueKey: keyof T
  ): Map<string, number[]> {
    const grouped = new Map<string, number[]>();

    for (const item of data) {
      const date = new Date(item[dateKey] as string);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, []);
      }
      grouped.get(monthKey)!.push(item[valueKey] as number);
    }

    return grouped;
  }
}
