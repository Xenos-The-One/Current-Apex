import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { FileText, Search, Calendar, Eye, CheckCircle, Clock, XCircle } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/_core/hooks/useAuth";

export default function PortalContent() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: contentList, isLoading } = trpc.seo.content.listForPortal.useQuery(
    undefined,
    { enabled: !!user }
  );

  // listForPortal already returns only content for this user's client
  const clientContent = contentList || [];

  // Apply search and status filters
  const filteredContent = clientContent.filter((item: any) => {
    const matchesSearch = !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.topic?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "draft": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "published": return <Eye className="h-4 w-4 text-blue-500" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500/10 text-green-500";
      case "draft": return "bg-yellow-500/10 text-yellow-500";
      case "published": return "bg-blue-500/10 text-blue-500";
      case "pending_approval": return "bg-orange-500/10 text-orange-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <PortalLayout activePath="/seo/portal/content">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">My Content</h2>
        <p className="text-sm mt-1" style={{ color: "rgba(0,255,255,0.5)" }}>View and manage your content</p>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "draft", "pending_approval", "approved", "published"].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "All" : s === "pending_approval" ? "Pending" : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Content List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading content...</div>
        </div>
      ) : filteredContent.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No content found</h3>
          <p className="text-muted-foreground">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Your content will appear here once created"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredContent.map((item: any) => (
            <Link key={item.id} href={`/seo/portal/content/${item.id}`}>
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(item.status)}
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.topic}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                      {item.scheduledPublishDate && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Scheduled: {new Date(item.scheduledPublishDate).toLocaleDateString()}
                        </div>
                      )}
                      {item.wordCount && <span>{item.wordCount} words</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={getStatusColor(item.status)}>
                      {item.status.replace("_", " ")}
                    </Badge>
                    {item.aiModel && (
                      <span className="text-xs text-muted-foreground">{item.aiModel}</span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
