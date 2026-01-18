
import fs from 'fs';
import path from 'path';

const STATS_FILE = path.join(process.cwd(), 'feedback-stats.json');

interface ErrorTypeStats {
  count: number;
  resolved: number;
  avgIterations: number;
}

interface FeedbackStatsData {
  totalFixes: number;
  resolvedFixes: number;
  byCategory: Record<string, ErrorTypeStats>;
  byRootCause: Record<string, ErrorTypeStats>;
  lastUpdated: string;
}

const DEFAULT_STATS: FeedbackStatsData = {
  totalFixes: 0,
  resolvedFixes: 0,
  byCategory: {},
  byRootCause: {},
  lastUpdated: new Date().toISOString()
};

export class FeedbackStats {
  private static loadStats(): FeedbackStatsData {
    try {
      if (fs.existsSync(STATS_FILE)) {
        const data = fs.readFileSync(STATS_FILE, 'utf-8');
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error loading feedback stats:', e);
    }
    return { ...DEFAULT_STATS };
  }

  private static saveStats(stats: FeedbackStatsData) {
    try {
      stats.lastUpdated = new Date().toISOString();
      fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    } catch (e) {
      console.error('Error saving feedback stats:', e);
    }
  }

  static logAttempt(category: string, rootCause: string) {
    const stats = this.loadStats();
    
    stats.totalFixes++;
    
    // Update category stats
    if (!stats.byCategory[category]) {
      stats.byCategory[category] = { count: 0, resolved: 0, avgIterations: 0 };
    }
    stats.byCategory[category].count++;

    // Update root cause stats
    if (!stats.byRootCause[rootCause]) {
      stats.byRootCause[rootCause] = { count: 0, resolved: 0, avgIterations: 0 };
    }
    stats.byRootCause[rootCause].count++;

    this.saveStats(stats);
  }

  static logResolution(category: string, rootCause: string, iterations: number) {
    const stats = this.loadStats();
    
    stats.resolvedFixes++;
    
    // Update category stats
    if (stats.byCategory[category]) {
      const cat = stats.byCategory[category];
      const currentTotalIterations = cat.avgIterations * cat.resolved;
      cat.resolved++;
      cat.avgIterations = (currentTotalIterations + iterations) / cat.resolved;
    }

    // Update root cause stats
    if (stats.byRootCause[rootCause]) {
      const rc = stats.byRootCause[rootCause];
      const currentTotalIterations = rc.avgIterations * rc.resolved;
      rc.resolved++;
      rc.avgIterations = (currentTotalIterations + iterations) / rc.resolved;
    }

    this.saveStats(stats);
  }

  static getStats() {
    return this.loadStats();
  }
}
