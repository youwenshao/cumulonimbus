import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { DEFAULT_CONFIG } from './types';

class NebulaDbManager {
  private static instance: NebulaDbManager;
  private connections: Map<string, any> = new Map();

  private constructor() {
    try {
      fs.ensureDirSync(DEFAULT_CONFIG.storagePath);
    } catch (err: any) {
      console.error('Failed to create nebula storage directory:', err);
    }
  }

  public static getInstance(): NebulaDbManager {
    if (!NebulaDbManager.instance) {
      NebulaDbManager.instance = new NebulaDbManager();
    }
    return NebulaDbManager.instance;
  }

  /**
   * Get a database connection for an app
   */
  public getDb(appId: string): any {
    if (this.connections.has(appId)) {
      return this.connections.get(appId);
    }

    const dbPath = path.join(DEFAULT_CONFIG.storagePath, `${appId}.db`);
    const db = new Database(dbPath);
    
    // Performance optimizations for SQLite
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');

    this.connections.set(appId, db);
    return db;
  }

  /**
   * Execute a query on an app's database
   */
  public query(appId: string, sql: string, params: any[] = []): any {
    const db = this.getDb(appId);
    try {
      const stmt = db.prepare(sql);
      if (sql.trim().toLowerCase().startsWith('select')) {
        return stmt.all(params);
      } else {
        const result = stmt.run(params);
        return {
          lastInsertRowid: result.lastInsertRowid,
          changes: result.changes
        };
      }
    } catch (error: any) {
      console.error(`DB Error [${appId}]:`, error);
      return { error: error.message };
    }
  }

  /**
   * Close a database connection
   */
  public closeDb(appId: string) {
    const db = this.connections.get(appId);
    if (db) {
      db.close();
      this.connections.delete(appId);
    }
  }
}

export const nebulaDbManager = NebulaDbManager.getInstance();
