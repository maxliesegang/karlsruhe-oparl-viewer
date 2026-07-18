import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import { DATA_BASE_URL } from "./constants";
import { mapConcurrent } from "./async-utils";

export interface DataSource {
  loadArray<T>(entity: string): Promise<T[]>;
  loadRecord<T>(name: string): Promise<Record<string, T | undefined>>;
  loadText(fileId: string): Promise<string | undefined>;
}

const FILE_READ_CONCURRENCY = 64;

function parseArray<T>(contents: string, location: string): T[] {
  const data: unknown = JSON.parse(contents);
  if (!Array.isArray(data)) {
    throw new TypeError(`Expected a JSON array in ${location}`);
  }
  return data as T[];
}

function parseDirectoryEntry<T>(contents: string, location: string): T[] {
  const data: unknown = JSON.parse(contents);
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") return [data as T];
  throw new TypeError(`Expected a JSON object or array in ${location}`);
}

function parseRecord<T>(
  contents: string,
  location: string,
): Record<string, T | undefined> {
  const data: unknown = JSON.parse(contents);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new TypeError(`Expected a JSON object in ${location}`);
  }
  return data as Record<string, T | undefined>;
}

class RemoteDataSource implements DataSource {
  async loadArray<T>(entity: string): Promise<T[]> {
    const url = `${DATA_BASE_URL}/${entity}.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    return parseArray<T>(await response.text(), url);
  }

  async loadRecord<T>(name: string): Promise<Record<string, T | undefined>> {
    const url = `${DATA_BASE_URL}/${name}.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    return parseRecord<T>(await response.text(), url);
  }

  async loadText(fileId: string): Promise<string | undefined> {
    const url = `${DATA_BASE_URL}/file-contents/${fileId}.txt`;
    const response = await fetch(url);
    if (response.status === 404) return undefined;
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    return response.text();
  }
}

class LocalDataSource implements DataSource {
  constructor(private readonly root: string) {}

  async loadArray<T>(entity: string): Promise<T[]> {
    const singleFile = resolve(this.root, `${entity}.json`);
    const shardDirectory = resolve(this.root, entity);

    try {
      if ((await stat(singleFile)).isFile()) {
        return parseArray<T>(await readFile(singleFile, "utf8"), singleFile);
      }
    } catch (error) {
      if (!isMissing(error)) throw error;
    }

    let shardNames: string[];
    try {
      shardNames = (await readdir(shardDirectory, { withFileTypes: true }))
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => entry.name)
        .sort();
    } catch (error) {
      if (isMissing(error)) {
        throw new Error(
          `Missing data store: expected ${singleFile} or JSON shards in ${shardDirectory}`,
        );
      }
      throw error;
    }

    if (shardNames.length === 0) {
      throw new Error(`No *.json shards found in ${shardDirectory}`);
    }

    const entries = await mapConcurrent(
      shardNames,
      FILE_READ_CONCURRENCY,
      async (shardName): Promise<T[]> => {
        const path = resolve(shardDirectory, shardName);
        return parseDirectoryEntry<T>(await readFile(path, "utf8"), path);
      },
    );
    return entries.flat();
  }

  async loadRecord<T>(name: string): Promise<Record<string, T | undefined>> {
    const path = resolve(this.root, `${name}.json`);
    return parseRecord<T>(await readFile(path, "utf8"), path);
  }

  async loadText(fileId: string): Promise<string | undefined> {
    const path = resolve(this.root, "file-contents", `${fileId}.txt`);
    try {
      return await readFile(path, "utf8");
    } catch (error) {
      if (isMissing(error)) return undefined;
      throw error;
    }
  }
}

function isMissing(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

type DataSourceName = "local" | "remote";

function parseDataSourceName(value: unknown): DataSourceName {
  const name = String(value ?? "local");
  if (name !== "local" && name !== "remote") {
    throw new Error(`DATA_SOURCE must be "local" or "remote", got ${name}`);
  }
  return name;
}

const sourceName = parseDataSourceName(import.meta.env.DATA_SOURCE);
const localRoot = resolve(
  process.cwd(),
  String(import.meta.env.DATA_LOCAL_DIR ?? "syndication-data/docs"),
);

export const dataSource: DataSource =
  sourceName === "local"
    ? new LocalDataSource(localRoot)
    : new RemoteDataSource();
