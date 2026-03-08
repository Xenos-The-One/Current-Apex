import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, GitBranch, Clock, ArrowLeftRight } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";

// Simple diff algorithm: compute line-level differences
function computeDiff(oldText: string, newText: string) {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: Array<{
    type: "unchanged" | "added" | "removed";
    oldLine?: string;
    newLine?: string;
    oldLineNum?: number;
    newLineNum?: number;
  }> = [];

  // Use LCS-based approach for better diffs
  const maxLen = Math.max(oldLines.length, newLines.length);
  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (oldIdx < oldLines.length && newIdx < newLines.length) {
      if (oldLines[oldIdx] === newLines[newIdx]) {
        result.push({
          type: "unchanged",
          oldLine: oldLines[oldIdx],
          newLine: newLines[newIdx],
          oldLineNum: oldIdx + 1,
          newLineNum: newIdx + 1,
        });
        oldIdx++;
        newIdx++;
      } else {
        // Look ahead to find matching lines
        let foundOld = -1;
        let foundNew = -1;
        for (let i = newIdx + 1; i < Math.min(newIdx + 10, newLines.length); i++) {
          if (oldLines[oldIdx] === newLines[i]) {
            foundNew = i;
            break;
          }
        }
        for (let i = oldIdx + 1; i < Math.min(oldIdx + 10, oldLines.length); i++) {
          if (oldLines[i] === newLines[newIdx]) {
            foundOld = i;
            break;
          }
        }

        if (foundNew !== -1 && (foundOld === -1 || foundNew - newIdx <= foundOld - oldIdx)) {
          // Lines were added
          while (newIdx < foundNew) {
            result.push({
              type: "added",
              newLine: newLines[newIdx],
              newLineNum: newIdx + 1,
            });
            newIdx++;
          }
        } else if (foundOld !== -1) {
          // Lines were removed
          while (oldIdx < foundOld) {
            result.push({
              type: "removed",
              oldLine: oldLines[oldIdx],
              oldLineNum: oldIdx + 1,
            });
            oldIdx++;
          }
        } else {
          // Changed line
          result.push({
            type: "removed",
            oldLine: oldLines[oldIdx],
            oldLineNum: oldIdx + 1,
          });
          result.push({
            type: "added",
            newLine: newLines[newIdx],
            newLineNum: newIdx + 1,
          });
          oldIdx++;
          newIdx++;
        }
      }
    } else if (oldIdx < oldLines.length) {
      result.push({
        type: "removed",
        oldLine: oldLines[oldIdx],
        oldLineNum: oldIdx + 1,
      });
      oldIdx++;
    } else {
      result.push({
        type: "added",
        newLine: newLines[newIdx],
        newLineNum: newIdx + 1,
      });
      newIdx++;
    }
  }

  return result;
}

export default function VersionHistory() {
  const [selectedContentId, setSelectedContentId] = useState<string>("");
  const [leftRevision, setLeftRevision] = useState<string>("");
  const [rightRevision, setRightRevision] = useState<string>("");
  const [viewMode, setViewMode] = useState<"side-by-side" | "unified">("side-by-side");

  const { data: contentList } = trpc.seo.content.list.useQuery();
  const { data: revisions } = trpc.seo.collaboration.getRevisions.useQuery(
    { contentId: parseInt(selectedContentId) },
    { enabled: !!selectedContentId }
  );
  const { data: currentContent } = trpc.seo.content.getById.useQuery(
    { id: parseInt(selectedContentId) },
    { enabled: !!selectedContentId }
  );

  // Build revision list including "current" version
  const allVersions = useMemo(() => {
    const versions: Array<{
      id: string;
      label: string;
      title: string;
      content: string;
      date: string;
      description: string;
    }> = [];

    if (revisions) {
      revisions.forEach((rev: any) => {
        versions.push({
          id: `rev-${rev.id}`,
          label: `Revision #${rev.revisionNumber}`,
          title: rev.title || "",
          content: rev.content || "",
          date: new Date(rev.createdAt).toLocaleString(),
          description: rev.changeDescription || "No description",
        });
      });
    }

    if (currentContent) {
      versions.push({
        id: "current",
        label: "Current Version",
        title: currentContent.title,
        content: currentContent.content,
        date: new Date(currentContent.updatedAt).toLocaleString(),
        description: "Current live version",
      });
    }

    return versions;
  }, [revisions, currentContent]);

  const leftVersion = allVersions.find((v) => v.id === leftRevision);
  const rightVersion = allVersions.find((v) => v.id === rightRevision);

  const diffResult = useMemo(() => {
    if (!leftVersion || !rightVersion) return [];
    return computeDiff(leftVersion.content, rightVersion.content);
  }, [leftVersion, rightVersion]);

  const addedCount = diffResult.filter((d) => d.type === "added").length;
  const removedCount = diffResult.filter((d) => d.type === "removed").length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/seo/content">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Content
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <GitBranch className="h-8 w-8" />
          Version History
        </h1>
        <p className="text-muted-foreground mt-2">
          Compare content revisions side-by-side to see what changed
        </p>
      </div>

      {/* Content Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Content</label>
              <Select
                value={selectedContentId}
                onValueChange={(v) => {
                  setSelectedContentId(v);
                  setLeftRevision("");
                  setRightRevision("");
                }}
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Choose content..." />
                </SelectTrigger>
                <SelectContent>
                  {contentList?.map((item) => (
                    <SelectItem key={item.content.id} value={item.content.id.toString()}>
                      {item.content.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedContentId && allVersions.length > 0 && (
              <div className="flex items-end gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium mb-2 text-red-400">
                    Left (Older)
                  </label>
                  <Select value={leftRevision} onValueChange={setLeftRevision}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select version..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allVersions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.label} - {v.date}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ArrowLeftRight className="h-5 w-5 text-muted-foreground mb-2" />

                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium mb-2 text-green-400">
                    Right (Newer)
                  </label>
                  <Select value={rightRevision} onValueChange={setRightRevision}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select version..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allVersions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.label} - {v.date}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 mb-0.5">
                  <Button
                    variant={viewMode === "side-by-side" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("side-by-side")}
                  >
                    Side by Side
                  </Button>
                  <Button
                    variant={viewMode === "unified" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("unified")}
                  >
                    Unified
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Version Timeline */}
      {selectedContentId && allVersions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Revision Timeline ({allVersions.length} versions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allVersions.map((v, idx) => (
                <div
                  key={v.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/30"
                >
                  <div className="flex-shrink-0 w-3 h-3 rounded-full bg-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{v.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{v.description}</p>
                  </div>
                  <p className="text-xs text-muted-foreground flex-shrink-0">{v.date}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diff View */}
      {leftVersion && rightVersion && (
        <>
          {/* Diff Stats */}
          <Card className="mb-4">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-6 text-sm">
                <span className="font-medium">Changes:</span>
                <span className="text-green-400">+{addedCount} added</span>
                <span className="text-red-400">-{removedCount} removed</span>
                <span className="text-muted-foreground">
                  {diffResult.filter((d) => d.type === "unchanged").length} unchanged
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Title Diff */}
          {leftVersion.title !== rightVersion.title && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Title Change</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded bg-red-500/10 border border-red-500/20">
                    <p className="text-sm line-through text-red-400">{leftVersion.title}</p>
                  </div>
                  <div className="p-3 rounded bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-400">{rightVersion.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Diff */}
          <Card>
            <CardHeader>
              <CardTitle>Content Diff</CardTitle>
            </CardHeader>
            <CardContent>
              {viewMode === "side-by-side" ? (
                <div className="grid grid-cols-2 gap-0 border border-border rounded-lg overflow-hidden">
                  {/* Left Header */}
                  <div className="bg-red-500/10 px-4 py-2 border-b border-border font-medium text-sm text-red-400">
                    {leftVersion.label}
                  </div>
                  <div className="bg-green-500/10 px-4 py-2 border-b border-border border-l font-medium text-sm text-green-400">
                    {rightVersion.label}
                  </div>

                  {/* Diff Lines */}
                  <div className="col-span-2 max-h-[600px] overflow-y-auto">
                    {diffResult.map((line, idx) => (
                      <div key={idx} className="grid grid-cols-2">
                        {/* Left side */}
                        <div
                          className={`px-4 py-1 text-sm font-mono border-b border-border/30 ${
                            line.type === "removed"
                              ? "bg-red-500/10 text-red-300"
                              : line.type === "added"
                              ? "bg-transparent text-transparent"
                              : "text-foreground/80"
                          }`}
                        >
                          <span className="text-muted-foreground mr-3 inline-block w-8 text-right select-none">
                            {line.oldLineNum || ""}
                          </span>
                          {line.type === "removed" && <span className="mr-2 text-red-400">-</span>}
                          {line.type === "unchanged" && <span className="mr-2">&nbsp;</span>}
                          {line.oldLine || (line.type === "added" ? "" : "")}
                        </div>
                        {/* Right side */}
                        <div
                          className={`px-4 py-1 text-sm font-mono border-b border-l border-border/30 ${
                            line.type === "added"
                              ? "bg-green-500/10 text-green-300"
                              : line.type === "removed"
                              ? "bg-transparent text-transparent"
                              : "text-foreground/80"
                          }`}
                        >
                          <span className="text-muted-foreground mr-3 inline-block w-8 text-right select-none">
                            {line.newLineNum || ""}
                          </span>
                          {line.type === "added" && <span className="mr-2 text-green-400">+</span>}
                          {line.type === "unchanged" && <span className="mr-2">&nbsp;</span>}
                          {line.newLine || (line.type === "removed" ? "" : "")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Unified View */
                <div className="border border-border rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
                  {diffResult.map((line, idx) => (
                    <div
                      key={idx}
                      className={`px-4 py-1 text-sm font-mono border-b border-border/30 ${
                        line.type === "added"
                          ? "bg-green-500/10 text-green-300"
                          : line.type === "removed"
                          ? "bg-red-500/10 text-red-300"
                          : "text-foreground/80"
                      }`}
                    >
                      <span className="text-muted-foreground mr-3 inline-block w-8 text-right select-none">
                        {line.oldLineNum || line.newLineNum || ""}
                      </span>
                      <span className="mr-2">
                        {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                      </span>
                      {line.type === "removed" ? line.oldLine : line.newLine || line.oldLine}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {selectedContentId && allVersions.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No revisions found for this content</p>
            <p className="text-sm text-muted-foreground mt-2">
              Revisions are created when content is edited through the Collaboration page
            </p>
          </CardContent>
        </Card>
      )}

      {!selectedContentId && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Select content above to view its version history</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
