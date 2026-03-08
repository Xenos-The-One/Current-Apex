/**
 * Manus Webdev API Helper
 * Provides functions to programmatically create and manage Manus web projects
 */
import { ENV } from "./env";

export interface CreateWebProjectOptions {
  name: string;
  title: string;
  description?: string;
  template?: "web-static" | "web-db-user";
  features?: string[]; // e.g., ["db", "server", "user"]
}

export interface WebProjectInfo {
  projectId: string;
  versionId: string;
  name: string;
  title: string;
  url: string;
  status: string;
}

/**
 * Create a new Manus web project programmatically
 */
export async function createManusWebProject(
  options: CreateWebProjectOptions
): Promise<WebProjectInfo> {
  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  const baseUrl = ENV.forgeApiUrl.endsWith("/")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;
  
  // Use the webdev service endpoint for project creation
  const fullUrl = new URL(
    "webdevtoken.v1.WebDevService/CreateProject",
    baseUrl
  ).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      name: options.name,
      title: options.title,
      description: options.description || "",
      template: options.template || "web-static",
      features: options.features || [],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Failed to create Manus web project (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = await response.json();
  return result as WebProjectInfo;
}

/**
 * Get information about a Manus web project
 */
export async function getManusWebProject(
  projectId: string
): Promise<WebProjectInfo> {
  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  const baseUrl = ENV.forgeApiUrl.endsWith("/")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;
  
  const fullUrl = new URL(
    "webdevtoken.v1.WebDevService/GetProject",
    baseUrl
  ).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      projectId,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Failed to get Manus web project (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = await response.json();
  return result as WebProjectInfo;
}

/**
 * Publish content to a Manus web project
 * This assumes the project has a blog/content management system set up
 */
export async function publishToManusWebsite(options: {
  projectId: string;
  title: string;
  content: string;
  slug?: string;
}): Promise<{ success: boolean; url?: string; message: string }> {
  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  const baseUrl = ENV.forgeApiUrl.endsWith("/")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;
  
  const fullUrl = new URL(
    "webdevtoken.v1.WebDevService/PublishContent",
    baseUrl
  ).toString();

  try {
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "connect-protocol-version": "1",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        projectId: options.projectId,
        title: options.title,
        content: options.content,
        slug: options.slug,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        success: false,
        message: `Failed to publish content (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`,
      };
    }

    const result = await response.json();
    return {
      success: true,
      url: result.url,
      message: "Content published successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
