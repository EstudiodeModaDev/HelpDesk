const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const DEFAULT_PAGE_SIZE = 200;
const DEFAULT_UPSERT_BATCH_SIZE = 500;
const DEFAULT_DELETE_BATCH_SIZE = 500;
const DEFAULT_TABLE_NAME = "TBL_Resolutor_Solvi";
const DEFAULT_TARGET_KEY = "sharepoint_id";
const DEFAULT_SOURCE_KEY = "Id";
const DEFAULT_FIELD_MAP: FieldMap = {
  Title: "resolutor_nombre",
  Correo: "resolutor_correo",
  Id: "sharepoint_id",
};
const DEFAULT_STATIC_VALUES: StaticValueMap = {
  resolutor_estado: "Activo",
};

export type FieldMap = Record<string, string>;
export type StaticValueMap = Record<string, string | number | boolean | null>;

export type SyncSharePointListConfig = {
  azureTenantId: string;
  graphScope: string;
  pageSize: number;
  sharePointClientId: string;
  sharePointClientSecret: string;
  sharePointListId?: string;
  sharePointListName?: string;
  sharePointSiteId?: string;
  sharePointSitePath?: string;
  sharePointSiteHostname?: string;
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
  syncDeleteBatchSize: number;
  syncFieldMap: FieldMap;
  syncPruneMissing: boolean;
  syncSourceKey: string;
  syncStaticValues: StaticValueMap;
  syncUseResolverActivoRule: boolean;
  syncTableName: string;
  syncTargetKey: string;
  upsertBatchSize: number;
};

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getOptionalEnv(name: string): string | undefined {
  const value = Deno.env.get(name)?.trim();
  return value || undefined;
}

function getBooleanEnv(name: string, defaultValue: boolean): boolean {
  const value = Deno.env.get(name)?.trim().toLowerCase();
  if (!value) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value);
}

function getNumberEnv(name: string, defaultValue: number): number {
  const rawValue = Deno.env.get(name)?.trim();
  if (!rawValue) {
    return defaultValue;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }

  return parsed;
}

function parseFieldMap(rawValue: string): FieldMap {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch (error) {
    throw new Error(
      `Invalid JSON for SHAREPOINT_SYNC_FIELD_MAP: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      "SHAREPOINT_SYNC_FIELD_MAP must be a JSON object where keys are SharePoint fields and values are Supabase columns.",
    );
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) {
    throw new Error("SHAREPOINT_SYNC_FIELD_MAP cannot be empty.");
  }

  const normalized: FieldMap = {};
  for (const [sourceField, targetColumn] of entries) {
    if (!sourceField.trim()) {
      throw new Error("SHAREPOINT_SYNC_FIELD_MAP contains an empty SharePoint field name.");
    }

    if (typeof targetColumn !== "string" || !targetColumn.trim()) {
      throw new Error(
        `SHAREPOINT_SYNC_FIELD_MAP value for "${sourceField}" must be a non-empty string.`,
      );
    }

    normalized[sourceField.trim()] = targetColumn.trim();
  }

  return normalized;
}

function getRequiredFieldMapEnv(name: string): FieldMap {
  return parseFieldMap(getRequiredEnv(name));
}

function parseStaticValueMap(rawValue: string): StaticValueMap {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch (error) {
    throw new Error(
      `Invalid JSON for SHAREPOINT_SYNC_STATIC_VALUES: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      "SHAREPOINT_SYNC_STATIC_VALUES must be a JSON object where keys are Supabase columns and values are constants.",
    );
  }

  const normalized: StaticValueMap = {};
  for (const [targetColumn, value] of Object.entries(parsed)) {
    if (!targetColumn.trim()) {
      throw new Error("SHAREPOINT_SYNC_STATIC_VALUES contains an empty column name.");
    }

    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new Error(
        `SHAREPOINT_SYNC_STATIC_VALUES value for "${targetColumn}" must be string, number, boolean, or null.`,
      );
    }

    normalized[targetColumn.trim()] = value;
  }

  return normalized;
}

function getStaticValueMapEnv(name: string, defaultValue: StaticValueMap): StaticValueMap {
  const value = getOptionalEnv(name);
  return value ? parseStaticValueMap(value) : defaultValue;
}

export function loadConfig(): SyncSharePointListConfig {
  const listId = getOptionalEnv("SHAREPOINT_LIST_ID")
  const listName = getOptionalEnv("SHAREPOINT_SYNC_LIST_NAME");
  const siteId = getOptionalEnv("SHAREPOINT_SITE_ID");
  const siteHostname = getOptionalEnv("SHAREPOINT_SITE_HOSTNAME");
  const sitePath = getOptionalEnv("SHAREPOINT_SITE_PATH");

  if (!listId && !listName) {
    throw new Error(
      "You must provide SHAREPOINT_SYNC_LIST_ID or SHAREPOINT_SYNC_LIST_NAME.",
    );
  }

  if (!siteId && (!siteHostname || !sitePath)) {
    throw new Error(
      "You must provide SHAREPOINT_SITE_ID or both SHAREPOINT_SITE_HOSTNAME and SHAREPOINT_SITE_PATH.",
    );
  }

  return {
    azureTenantId: getRequiredEnv("AZURE_TENANT_ID"),
    graphScope: getOptionalEnv("SHAREPOINT_GRAPH_SCOPE") ?? GRAPH_SCOPE,
    pageSize: getNumberEnv("SHAREPOINT_SYNC_PAGE_SIZE", DEFAULT_PAGE_SIZE),
    sharePointClientId: getOptionalEnv("SHAREPOINT_CLIENT_ID") ??
      getRequiredEnv("SOLVI_CLIENT_ID"),
    sharePointClientSecret: getOptionalEnv("SHAREPOINT_CLIENT_SECRET") ??
      getRequiredEnv("SOLVI_CLIENT_SECRET"),
    sharePointListId: listId,
    sharePointListName: listName,
    sharePointSiteId: siteId,
    sharePointSitePath: sitePath,
    sharePointSiteHostname: siteHostname,
    supabaseServiceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    supabaseUrl: getRequiredEnv("SUPABASE_URL"),
    syncDeleteBatchSize: getNumberEnv(
      "SHAREPOINT_SYNC_DELETE_BATCH_SIZE",
      DEFAULT_DELETE_BATCH_SIZE,
    ),
    syncFieldMap: getOptionalEnv("SHAREPOINT_SYNC_FIELD_MAP")
      ? getRequiredFieldMapEnv("SHAREPOINT_SYNC_FIELD_MAP")
      : DEFAULT_FIELD_MAP,
    syncPruneMissing: getBooleanEnv("SHAREPOINT_SYNC_PRUNE_MISSING", false),
    syncSourceKey: getOptionalEnv("SHAREPOINT_SYNC_SOURCE_KEY") ?? DEFAULT_SOURCE_KEY,
    syncStaticValues: getStaticValueMapEnv(
      "SHAREPOINT_SYNC_STATIC_VALUES",
      DEFAULT_STATIC_VALUES,
    ),
    syncUseResolverActivoRule: getBooleanEnv(
      "SHAREPOINT_SYNC_USE_RESOLUTOR_ACTIVO_RULE",
      true,
    ),
    syncTableName: getOptionalEnv("SHAREPOINT_SYNC_TABLE") ?? DEFAULT_TABLE_NAME,
    syncTargetKey: getOptionalEnv("SHAREPOINT_SYNC_TARGET_KEY") ?? DEFAULT_TARGET_KEY,
    upsertBatchSize: getNumberEnv(
      "SHAREPOINT_SYNC_UPSERT_BATCH_SIZE",
      DEFAULT_UPSERT_BATCH_SIZE,
    ),
  };
}

export function mergeConfig(
  baseConfig: SyncSharePointListConfig,
  input: Partial<SyncSharePointListConfigInput>,
): SyncSharePointListConfig {
  const nextFieldMap = input.syncFieldMap
    ? parseFieldMap(JSON.stringify(input.syncFieldMap))
    : baseConfig.syncFieldMap;
  const nextStaticValues = input.syncStaticValues
    ? parseStaticValueMap(JSON.stringify(input.syncStaticValues))
    : baseConfig.syncStaticValues;

  const nextConfig: SyncSharePointListConfig = {
    ...baseConfig,
    pageSize: input.pageSize ?? baseConfig.pageSize,
    sharePointListId: input.sharePointListId ?? baseConfig.sharePointListId,
    sharePointListName: input.sharePointListName ?? baseConfig.sharePointListName,
    sharePointSiteHostname: input.sharePointSiteHostname ??
      baseConfig.sharePointSiteHostname,
    sharePointSiteId: input.sharePointSiteId ?? baseConfig.sharePointSiteId,
    sharePointSitePath: input.sharePointSitePath ?? baseConfig.sharePointSitePath,
    syncDeleteBatchSize: input.syncDeleteBatchSize ?? baseConfig.syncDeleteBatchSize,
    syncFieldMap: nextFieldMap,
    syncPruneMissing: input.syncPruneMissing ?? baseConfig.syncPruneMissing,
    syncSourceKey: input.syncSourceKey ?? baseConfig.syncSourceKey,
    syncStaticValues: nextStaticValues,
    syncUseResolverActivoRule: input.syncUseResolverActivoRule ??
      baseConfig.syncUseResolverActivoRule,
    syncTableName: input.syncTableName ?? baseConfig.syncTableName,
    syncTargetKey: input.syncTargetKey ?? baseConfig.syncTargetKey,
    upsertBatchSize: input.upsertBatchSize ?? baseConfig.upsertBatchSize,
  };

  if (!nextConfig.sharePointListId && !nextConfig.sharePointListName) {
    throw new Error("The final configuration must include sharePointListId or sharePointListName.");
  }

  if (
    !nextConfig.sharePointSiteId &&
    (!nextConfig.sharePointSiteHostname || !nextConfig.sharePointSitePath)
  ) {
    throw new Error(
      "The final configuration must include sharePointSiteId or both sharePointSiteHostname and sharePointSitePath.",
    );
  }

  return nextConfig;
}

export type SyncSharePointListConfigInput = {
  pageSize?: number;
  sharePointListId?: string;
  sharePointListName?: string;
  sharePointSiteHostname?: string;
  sharePointSiteId?: string;
  sharePointSitePath?: string;
  syncDeleteBatchSize?: number;
  syncFieldMap?: FieldMap;
  syncPruneMissing?: boolean;
  syncSourceKey?: string;
  syncStaticValues?: StaticValueMap;
  syncUseResolverActivoRule?: boolean;
  syncTableName?: string;
  syncTargetKey?: string;
  upsertBatchSize?: number;
};
