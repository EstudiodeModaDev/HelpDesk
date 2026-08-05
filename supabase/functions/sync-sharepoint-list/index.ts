import "@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "@supabase/supabase-js";

import {
  loadConfig,
  mergeConfig,
  type FieldMap,
  type SyncSharePointListConfig,
  type SyncSharePointListConfigInput,
} from "./config.ts";

type GraphTokenResponse = {
  access_token?: string;
};

type GraphListItem = {
  id: string;
  fields?: Record<string, unknown>;
};

type GraphListResponse<T> = {
  "@odata.nextLink"?: string;
  value?: T[];
};

type SyncRequestBody = SyncSharePointListConfigInput;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertPositiveInteger(name: string, value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
}

function escapeODataValue(value: string): string {
  return value.replaceAll("'", "''");
}

function isSharePointIdField(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "id";
}

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function normalizeText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value).trim().toLowerCase();
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return "";
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeText(value);
  if (!normalized) {
    return undefined;
  }

  if (["true", "1", "yes", "si", "sí"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }

  return undefined;
}

function shouldSetResolverActivoFalse(fields: Record<string, unknown>): boolean {
  const disponible = normalizeText(fields.Disponible);
  return disponible === "no disponible" || disponible === "inactivo";
}

async function getGraphAccessToken(
  config: SyncSharePointListConfig,
): Promise<string> {
  const response = await fetch(
    `https://login.microsoftonline.com/${config.azureTenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.sharePointClientId,
        client_secret: config.sharePointClientSecret,
        scope: config.graphScope,
        grant_type: "client_credentials",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Unable to obtain Graph token (${response.status}): ${await response.text()}`,
    );
  }

  const payload = await response.json() as GraphTokenResponse;
  if (!payload.access_token) {
    throw new Error("Graph token response did not include access_token.");
  }

  return payload.access_token;
}

async function graphFetch<T>(
  accessToken: string,
  pathOrUrl: string,
): Promise<T> {
  const url = pathOrUrl.startsWith("https://")
    ? pathOrUrl
    : `https://graph.microsoft.com/v1.0${pathOrUrl}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Graph request failed (${response.status}) ${url}: ${await response.text()}`,
    );
  }

  return await response.json() as T;
}

async function resolveListId(
  accessToken: string,
  config: SyncSharePointListConfig,
): Promise<string> {
  if (config.sharePointListId) {
    return config.sharePointListId;
  }

  if (!config.sharePointListName) {
    throw new Error("sharePointListId or sharePointListName is required.");
  }

  const siteId = await resolveSiteId(accessToken, config);
  const filter = encodeURIComponent(
    `displayName eq '${escapeODataValue(config.sharePointListName)}'`,
  );

  const response = await graphFetch<
    GraphListResponse<{ id: string; displayName?: string }>
  >(
    accessToken,
    `/sites/${encodeURIComponent(siteId)}/lists?$filter=${filter}&$top=2`,
  );

  const list = response.value?.[0];
  if (!list?.id) {
    throw new Error(
      `SharePoint list "${config.sharePointListName}" was not found in site ${siteId}.`,
    );
  }

  return list.id;
}

async function resolveSiteId(
  accessToken: string,
  config: SyncSharePointListConfig,
): Promise<string> {
  if (config.sharePointSiteId) {
    return config.sharePointSiteId;
  }

  if (!config.sharePointSiteHostname || !config.sharePointSitePath) {
    throw new Error("sharePointSiteId or sharePointSiteHostname/sharePointSitePath is required.");
  }

  const response = await graphFetch<{ id?: string }>(
    accessToken,
    `/sites/${encodeURIComponent(config.sharePointSiteHostname)}:${
      config.sharePointSitePath.startsWith("/") ? config.sharePointSitePath : `/${config.sharePointSitePath}`
    }`,
  );

  if (!response.id) {
    throw new Error("Graph did not return a site id for the configured SharePoint site.");
  }

  return response.id;
}

async function fetchSharePointItems(
  accessToken: string,
  config: SyncSharePointListConfig,
  listId: string,
): Promise<GraphListItem[]> {
  const items: GraphListItem[] = [];
  const siteId = await resolveSiteId(accessToken, config);
  const sourceFields = Array.from(new Set(Object.keys(config.syncFieldMap)));
  const selectableFields = sourceFields.filter((field) => !isSharePointIdField(field));
  const fieldsSelect = selectableFields.length > 0
    ? `fields($select=${selectableFields.map(encodeURIComponent).join(",")})`
    : "fields";

  let nextPath =
    `/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items` +
    `?$top=${config.pageSize}&$expand=${fieldsSelect}&$select=id,fields`;

  while (nextPath) {
    const response = await graphFetch<GraphListResponse<GraphListItem>>(
      accessToken,
      nextPath,
    );

    items.push(...(response.value ?? []));
    nextPath = response["@odata.nextLink"] ?? "";
  }

  return items;
}

function mapItemToRow(
  item: GraphListItem,
  config: SyncSharePointListConfig,
): Record<string, unknown> {
  const fields = item.fields ?? {};
  const sourceKeyValue = isSharePointIdField(config.syncSourceKey)
    ? item.id
    : fields[config.syncSourceKey];
  const row: Record<string, unknown> = {
    [config.syncTargetKey]: sourceKeyValue,
  };

  for (const [sourceField, targetColumn] of Object.entries(config.syncFieldMap)) {
    row[targetColumn] = isSharePointIdField(sourceField) ? item.id : fields[sourceField];
  }

  for (const [targetColumn, value] of Object.entries(config.syncStaticValues)) {
    row[targetColumn] = value;
  }

  if (config.syncUseResolverActivoRule) {
    row.resolutor_activo = !shouldSetResolverActivoFalse(fields);
  }

  const targetKeyValue = row[config.syncTargetKey];
  if (
    targetKeyValue === undefined || targetKeyValue === null ||
    String(targetKeyValue).trim() === ""
  ) {
    throw new Error(
      `SharePoint item ${item.id} does not include a usable value for source key "${config.syncSourceKey}".`,
    );
  }

  return row;
}

async function upsertRows(
  config: SyncSharePointListConfig,
  rows: Record<string, unknown>[],
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let upserted = 0;

  for (const batch of chunkArray(rows, config.upsertBatchSize)) {
    const { error } = await supabase
      .from(config.syncTableName)
      .upsert(batch, {
        onConflict: config.syncTargetKey,
      });

    if (error) {
      throw new Error(
        `Failed to upsert rows into ${config.syncTableName}: ${error.message}`,
      );
    }

    upserted += batch.length;
  }

  return upserted;
}

async function pruneMissingRows(
  config: SyncSharePointListConfig,
  sourceRows: Record<string, unknown>[],
): Promise<number> {
  if (!config.syncPruneMissing || sourceRows.length === 0) {
    return 0;
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const sourceKeys = new Set(
    sourceRows.map((row) => String(row[config.syncTargetKey])),
  );

  const { data, error } = await supabase
    .from(config.syncTableName)
    .select(config.syncTargetKey);

  if (error) {
    throw new Error(
      `Failed to list existing rows from ${config.syncTableName}: ${error.message}`,
    );
  }

  const keysToDelete = (data ?? [])
    .map((row) => row[config.syncTargetKey])
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value))
    .filter((value) => !sourceKeys.has(value));

  let deleted = 0;

  for (const batch of chunkArray(keysToDelete, config.syncDeleteBatchSize)) {
    const { error: deleteError } = await supabase
      .from(config.syncTableName)
      .delete()
      .in(config.syncTargetKey, batch);

    if (deleteError) {
      throw new Error(
        `Failed to delete obsolete rows from ${config.syncTableName}: ${deleteError.message}`,
      );
    }

    deleted += batch.length;
  }

  return deleted;
}

async function readRequestBody(request: Request): Promise<SyncRequestBody> {
  if (request.method !== "POST") {
    return {};
  }

  const text = await request.text();
  if (!text.trim()) {
    return {};
  }

  let payload: unknown;

  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error(
      `Request body must be valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!isObject(payload)) {
    throw new Error("Request body must be a JSON object.");
  }

  const input = payload as Record<string, unknown>;
  const body: SyncRequestBody = {};

  if (input.pageSize !== undefined) {
    if (typeof input.pageSize !== "number") {
      throw new Error("pageSize must be a number.");
    }
    assertPositiveInteger("pageSize", input.pageSize);
    body.pageSize = input.pageSize;
  }

  if (input.sharePointListId !== undefined) {
    if (typeof input.sharePointListId !== "string" || !input.sharePointListId.trim()) {
      throw new Error("sharePointListId must be a non-empty string.");
    }
    body.sharePointListId = input.sharePointListId.trim();
  }

  if (input.sharePointListName !== undefined) {
    if (
      typeof input.sharePointListName !== "string" ||
      !input.sharePointListName.trim()
    ) {
      throw new Error("sharePointListName must be a non-empty string.");
    }
    body.sharePointListName = input.sharePointListName.trim();
  }

  if (input.sharePointSiteHostname !== undefined) {
    if (
      typeof input.sharePointSiteHostname !== "string" ||
      !input.sharePointSiteHostname.trim()
    ) {
      throw new Error("sharePointSiteHostname must be a non-empty string.");
    }
    body.sharePointSiteHostname = input.sharePointSiteHostname.trim();
  }

  if (input.sharePointSiteId !== undefined) {
    if (typeof input.sharePointSiteId !== "string" || !input.sharePointSiteId.trim()) {
      throw new Error("sharePointSiteId must be a non-empty string.");
    }
    body.sharePointSiteId = input.sharePointSiteId.trim();
  }

  if (input.sharePointSitePath !== undefined) {
    if (
      typeof input.sharePointSitePath !== "string" ||
      !input.sharePointSitePath.trim()
    ) {
      throw new Error("sharePointSitePath must be a non-empty string.");
    }
    body.sharePointSitePath = input.sharePointSitePath.trim();
  }

  if (input.syncDeleteBatchSize !== undefined) {
    if (typeof input.syncDeleteBatchSize !== "number") {
      throw new Error("syncDeleteBatchSize must be a number.");
    }
    assertPositiveInteger("syncDeleteBatchSize", input.syncDeleteBatchSize);
    body.syncDeleteBatchSize = input.syncDeleteBatchSize;
  }

  if (input.syncFieldMap !== undefined) {
    if (!isObject(input.syncFieldMap)) {
      throw new Error("syncFieldMap must be an object.");
    }
    body.syncFieldMap = input.syncFieldMap as FieldMap;
  }

  if (input.syncPruneMissing !== undefined) {
    if (typeof input.syncPruneMissing !== "boolean") {
      throw new Error("syncPruneMissing must be a boolean.");
    }
    body.syncPruneMissing = input.syncPruneMissing;
  }

  if (input.syncSourceKey !== undefined) {
    if (typeof input.syncSourceKey !== "string" || !input.syncSourceKey.trim()) {
      throw new Error("syncSourceKey must be a non-empty string.");
    }
    body.syncSourceKey = input.syncSourceKey.trim();
  }

  if (input.syncStaticValues !== undefined) {
    if (!isObject(input.syncStaticValues)) {
      throw new Error("syncStaticValues must be an object.");
    }
    body.syncStaticValues = input.syncStaticValues as Record<string, string | number | boolean | null>;
  }

  if (input.syncUseResolverActivoRule !== undefined) {
    if (typeof input.syncUseResolverActivoRule !== "boolean") {
      throw new Error("syncUseResolverActivoRule must be a boolean.");
    }
    body.syncUseResolverActivoRule = input.syncUseResolverActivoRule;
  }

  if (input.syncTableName !== undefined) {
    if (typeof input.syncTableName !== "string" || !input.syncTableName.trim()) {
      throw new Error("syncTableName must be a non-empty string.");
    }
    body.syncTableName = input.syncTableName.trim();
  }

  if (input.syncTargetKey !== undefined) {
    if (typeof input.syncTargetKey !== "string" || !input.syncTargetKey.trim()) {
      throw new Error("syncTargetKey must be a non-empty string.");
    }
    body.syncTargetKey = input.syncTargetKey.trim();
  }

  if (input.upsertBatchSize !== undefined) {
    if (typeof input.upsertBatchSize !== "number") {
      throw new Error("upsertBatchSize must be a number.");
    }
    assertPositiveInteger("upsertBatchSize", input.upsertBatchSize);
    body.upsertBatchSize = input.upsertBatchSize;
  }

  return body;
}

Deno.serve(async (request) => {
  if (request.method !== "GET" && request.method !== "POST") {
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 405 },
    );
  }

  try {
    const baseConfig = loadConfig();
    const requestBody = await readRequestBody(request);
    const config = mergeConfig(baseConfig, requestBody);
    const accessToken = await getGraphAccessToken(config);
    const listId = await resolveListId(accessToken, config);
    const items = await fetchSharePointItems(accessToken, config, listId);

    if (items.length === 0) {
      return Response.json(
        {
          ok: true,
          fetched: 0,
          upserted: 0,
          deleted: 0,
          listId,
          table: config.syncTableName,
          message:
            "The SharePoint list returned no items. Supabase was not modified.",
        },
      );
    }

    const rows = items.map((item) => mapItemToRow(item, config));
    const upserted = await upsertRows(config, rows);
    const deleted = await pruneMissingRows(config, rows);

    return Response.json({
      ok: true,
      deleted,
      fetched: items.length,
      listId,
      message: "SharePoint list synchronized successfully.",
      table: config.syncTableName,
      upserted,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error("sync-sharepoint-list execution failed", { error: reason });

    return Response.json(
      {
        ok: false,
        error: reason,
      },
      { status: 500 },
    );
  }
});
