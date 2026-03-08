import { NextResponse } from "next/server";
import {
  createBacklogClient,
  getBacklogHost,
  getProjectKeys,
} from "@/lib/backlog-client";
import { fetchRawProjectData } from "@/lib/backlog-fetcher";
import { syncProjectToDatabase, type SyncResult } from "@/lib/backlog-sync";

export async function POST() {
  try {
    const backlog = createBacklogClient();
    const host = getBacklogHost();
    const projectKeys = getProjectKeys();
    const apiKey = process.env.BACKLOG_API_KEY;
    if (!apiKey) throw new Error("BACKLOG_API_KEY must be set");

    const since = new Date();
    since.setMonth(since.getMonth() - 3);
    const createdSince = since.toISOString().split("T")[0];

    const fetchResults = await Promise.allSettled(
      projectKeys.map((key) =>
        fetchRawProjectData(backlog, host, apiKey, key, createdSince),
      ),
    );

    const results: SyncResult[] = [];

    for (let i = 0; i < fetchResults.length; i++) {
      const result = fetchResults[i];
      if (result.status === "fulfilled") {
        const syncResult = await syncProjectToDatabase(result.value);
        results.push(syncResult);
      } else {
        const key = projectKeys[i];
        console.error(`Failed to fetch project ${key}:`, result.reason);
        results.push({
          projectKey: key,
          issueCount: 0,
          memberCount: 0,
          status: "error",
          error: result.reason?.message ?? "Failed to fetch from Backlog API",
        });
      }
    }

    const hasError = results.some((r) => r.status === "error");
    return NextResponse.json({ results }, { status: hasError ? 207 : 200 });
  } catch (error) {
    console.error("Sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 },
    );
  }
}
