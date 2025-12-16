/**
 * AnalysisEngine Tests - Test statistical analysis utilities
 */

import { describe, it, expect } from "vitest";
import { AnalysisEngine } from "../../agents/utils/AnalysisEngine";
import { Trend } from "../../agents/types";

describe("AnalysisEngine", () => {
  describe("getStats", () => {
    it("should calculate correct statistics for a simple array", () => {
      const values = [1, 2, 3, 4, 5];
      const stats = AnalysisEngine.getStats(values);

      expect(stats.mean).toBe(3);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(5);
      expect(stats.count).toBe(5);
    });

    it("should calculate median correctly for odd count", () => {
      const values = [1, 2, 3, 4, 5];
      const stats = AnalysisEngine.getStats(values);

      expect(stats.median).toBe(3);
    });

    it("should calculate median correctly for even count", () => {
      const values = [1, 2, 3, 4];
      const stats = AnalysisEngine.getStats(values);

      expect(stats.median).toBe(2.5);
    });

    it("should handle empty arrays", () => {
      const values: number[] = [];
      const stats = AnalysisEngine.getStats(values);

      expect(stats.mean).toBe(0);
      expect(stats.count).toBe(0);
    });

    it("should handle single value", () => {
      const values = [42];
      const stats = AnalysisEngine.getStats(values);

      expect(stats.mean).toBe(42);
      expect(stats.median).toBe(42);
      expect(stats.min).toBe(42);
      expect(stats.max).toBe(42);
      expect(stats.stdDev).toBe(0);
    });
  });

  describe("detectTrend", () => {
    it("should detect improving trend", () => {
      const data = [
        { timestamp: "2024-01-01", value: 10 },
        { timestamp: "2024-02-01", value: 20 },
        { timestamp: "2024-03-01", value: 30 },
        { timestamp: "2024-04-01", value: 40 },
      ];

      const trend = AnalysisEngine.detectTrend(data);
      expect(trend).toBe(Trend.IMPROVING);
    });

    it("should detect declining trend", () => {
      const data = [
        { timestamp: "2024-01-01", value: 40 },
        { timestamp: "2024-02-01", value: 30 },
        { timestamp: "2024-03-01", value: 20 },
        { timestamp: "2024-04-01", value: 10 },
      ];

      const trend = AnalysisEngine.detectTrend(data);
      expect(trend).toBe(Trend.DECLINING);
    });

    it("should detect stable trend for constant values", () => {
      const data = [
        { timestamp: "2024-01-01", value: 50 },
        { timestamp: "2024-02-01", value: 50 },
        { timestamp: "2024-03-01", value: 50 },
        { timestamp: "2024-04-01", value: 50 },
      ];

      const trend = AnalysisEngine.detectTrend(data);
      expect(trend).toBe(Trend.STABLE);
    });

    it("should return stable for insufficient data", () => {
      const data = [{ timestamp: "2024-01-01", value: 50 }];

      const trend = AnalysisEngine.detectTrend(data);
      expect(trend).toBe(Trend.STABLE);
    });
  });

  describe("findAnomalies", () => {
    it("should find anomalies outside standard deviation threshold", () => {
      const values = [10, 11, 10, 12, 11, 10, 50, 11, 10, 12]; // 50 is an outlier
      const anomalies = AnalysisEngine.findAnomalies(values);

      expect(anomalies).toContain(50);
      expect(anomalies.length).toBe(1);
    });

    it("should return empty array when no anomalies", () => {
      const values = [10, 11, 10, 12, 11, 10, 11, 10, 12];
      const anomalies = AnalysisEngine.findAnomalies(values);

      expect(anomalies.length).toBe(0);
    });

    it("should handle empty array", () => {
      const anomalies = AnalysisEngine.findAnomalies([]);
      expect(anomalies.length).toBe(0);
    });
  });

  describe("calculateWeightedScore", () => {
    it("should calculate weighted score correctly", () => {
      const factors = [
        { value: 80, weight: 0.5 },
        { value: 60, weight: 0.3 },
        { value: 40, weight: 0.2 },
      ];

      const score = AnalysisEngine.calculateWeightedScore(factors);

      // (80 * 0.5 + 60 * 0.3 + 40 * 0.2) = 40 + 18 + 8 = 66
      expect(score).toBe(66);
    });

    it("should handle empty factors", () => {
      const score = AnalysisEngine.calculateWeightedScore([]);
      expect(score).toBe(0);
    });

    it("should handle single factor", () => {
      const factors = [{ value: 100, weight: 1 }];
      const score = AnalysisEngine.calculateWeightedScore(factors);

      expect(score).toBe(100);
    });
  });

  describe("getCorrelation", () => {
    it("should detect positive correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];

      const correlation = AnalysisEngine.getCorrelation(x, y);
      expect(correlation).toBeCloseTo(1, 5);
    });

    it("should detect negative correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2];

      const correlation = AnalysisEngine.getCorrelation(x, y);
      expect(correlation).toBeCloseTo(-1, 5);
    });

    it("should detect no correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [5, 5, 5, 5, 5]; // Constant values

      const correlation = AnalysisEngine.getCorrelation(x, y);
      expect(correlation).toBe(0);
    });

    it("should handle mismatched array lengths", () => {
      const x = [1, 2, 3];
      const y = [1, 2];

      const correlation = AnalysisEngine.getCorrelation(x, y);
      expect(correlation).toBe(0);
    });
  });

  describe("normalize", () => {
    it("should normalize values to 0-100 range", () => {
      const values = [0, 50, 100];
      const normalized = AnalysisEngine.normalize(values);

      // normalize returns 0-100 scale
      expect(normalized).toEqual([0, 50, 100]);
    });

    it("should handle single value by returning 50", () => {
      const values = [50];
      const normalized = AnalysisEngine.normalize(values);

      // Single value: max - min = 0, so returns 50 as default
      expect(normalized).toEqual([50]);
    });

    it("should handle all same values by returning 50", () => {
      const values = [5, 5, 5];
      const normalized = AnalysisEngine.normalize(values);

      // Same values: max - min = 0, so returns 50 as default for each
      expect(normalized).toEqual([50, 50, 50]);
    });
  });

  describe("forecast", () => {
    it("should forecast based on trend", () => {
      const values = [10, 20, 30, 40, 50];
      const forecast = AnalysisEngine.forecast(values, 3);

      // Should predict roughly 60, 70, 80
      expect(forecast.length).toBe(3);
      expect(forecast[0]).toBeGreaterThan(50);
    });

    it("should return empty array for empty input", () => {
      const forecast = AnalysisEngine.forecast([], 3);
      expect(forecast).toEqual([]);
    });

    it("should handle negative periods", () => {
      const forecast = AnalysisEngine.forecast([1, 2, 3], 0);
      expect(forecast).toEqual([]);
    });
  });
});
