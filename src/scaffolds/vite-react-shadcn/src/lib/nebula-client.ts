/**
 * Nebula Data Client
 * Provides data persistence for Cumulonimbus-hosted apps
 * 
 * This client communicates with the Nebula runtime to store and retrieve data.
 * Data is persisted in a SQLite database unique to each app.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// Type for record with ID
export interface NebulaRecord {
  id: string;
  [key: string]: unknown;
}

// API response types
interface NebulaResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Base API URL - uses relative path for Nebula runtime
const API_BASE = '/api/nebula/data';

/**
 * Low-level Nebula API functions
 */
export const NebulaAPI = {
  /**
   * Fetch all records
   */
  async getAll<T extends NebulaRecord>(): Promise<T[]> {
    const response = await fetch(API_BASE, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const result: NebulaResponse<T[]> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch data');
    return result.data || [];
  },

  /**
   * Fetch a single record by ID
   */
  async getById<T extends NebulaRecord>(id: string): Promise<T | null> {
    const response = await fetch(`${API_BASE}?id=${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const result: NebulaResponse<T> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch record');
    return result.data || null;
  },

  /**
   * Create a new record
   */
  async create<T extends NebulaRecord>(data: Omit<T, 'id'> & { id?: string }): Promise<T> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result: NebulaResponse<T> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to create record');
    return result.data!;
  },

  /**
   * Update an existing record
   */
  async update<T extends NebulaRecord>(id: string, data: Partial<T>): Promise<T> {
    const response = await fetch(API_BASE, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    const result: NebulaResponse<T> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to update record');
    return result.data!;
  },

  /**
   * Delete a record
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(API_BASE, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const result: NebulaResponse<void> = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete record');
  },
};

/**
 * React hook for Nebula data management
 * Provides CRUD operations with automatic state management and optimistic updates
 */
export function useNebulaData<T extends NebulaRecord>() {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data on mount
  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);
        const records = await NebulaAPI.getAll<T>();
        if (mounted) {
          setData(records);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch data');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  // Refresh data
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const records = await NebulaAPI.getAll<T>();
      setData(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new record
  const create = useCallback(async (newData: Omit<T, 'id'> & { id?: string }): Promise<T> => {
    try {
      setError(null);
      const created = await NebulaAPI.create<T>(newData);
      setData(prev => [...prev, created]);
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create record';
      setError(message);
      throw new Error(message);
    }
  }, []);

  // Update an existing record
  const update = useCallback(async (id: string, updates: Partial<T>): Promise<T> => {
    try {
      setError(null);
      const updated = await NebulaAPI.update<T>(id, updates);
      setData(prev => prev.map(item => item.id === id ? updated : item));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update record';
      setError(message);
      throw new Error(message);
    }
  }, []);

  // Delete a record
  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await NebulaAPI.delete(id);
      setData(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete record';
      setError(message);
      throw new Error(message);
    }
  }, []);

  // Find a record by ID
  const findById = useCallback((id: string): T | undefined => {
    return data.find(item => item.id === id);
  }, [data]);

  // Filter records
  const filter = useCallback((predicate: (item: T) => boolean): T[] => {
    return data.filter(predicate);
  }, [data]);

  return useMemo(() => ({
    // Data
    data,
    isLoading,
    error,
    
    // CRUD operations
    create,
    update,
    remove,
    refresh,
    
    // Query helpers
    findById,
    filter,
    
    // Count
    count: data.length,
  }), [data, isLoading, error, create, update, remove, refresh, findById, filter]);
}

/**
 * Generate a unique ID for records
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Re-export for convenience
export default useNebulaData;
