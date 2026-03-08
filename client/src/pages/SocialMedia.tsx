import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Calendar, Plus, Facebook, Instagram, Linkedin, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function SocialMedia() {
  const { data: clientInfo } = trpc.crm.getMyInfo.useQuery();
  const { data: posts, isLoading } = trpc.social.listPosts.useQuery();

  const isReadOnly = clientInfo?.client.accessMode === "read_only";

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "facebook":
        return <Facebook className="w-4 h-4" />;
      case "instagram":
        return <Instagram className="w-4 h-4" />;
      case "linkedin":
        return <Linkedin className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-muted text-muted-foreground";
      case "scheduled":
        return "bg-primary text-primary-foreground";
      case "published":
        return "bg-success text-success-foreground";
      case "failed":
        return "bg-destructive text-destructive-foreground";
      default:
        return "";
    }
  };

  const stats = {
    total: posts?.length || 0,
    scheduled: posts?.filter(p => p.status === "scheduled").length || 0,
    published: posts?.filter(p => p.status === "published").length || 0,
    draft: posts?.filter(p => p.status === "draft").length || 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Social Media Scheduler</h1>
            <p className="text-muted-foreground mt-2">
              Schedule and manage posts across Facebook, Instagram, and LinkedIn
            </p>
          </div>
          {!isReadOnly && (
            <Link href="/social/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Post
              </Button>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.scheduled}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.published}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Drafts</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draft}</div>
            </CardContent>
          </Card>
        </div>

        {/* Posts List */}
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Posts</CardTitle>
            <CardDescription>
              All your social media posts across platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading posts...</p>
              </div>
            ) : posts && posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Link key={post.id} href={`/social/${post.id}`}>
                    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                        {getPlatformIcon(post.platform)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="capitalize">
                            {post.platform}
                          </Badge>
                          <Badge className={getStatusColor(post.status)}>
                            {post.status}
                          </Badge>
                          {post.scheduledDate && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(post.scheduledDate).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className="text-sm line-clamp-2">{post.content}</p>
                        {post.mediaUrls && JSON.parse(post.mediaUrls).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            📎 {JSON.parse(post.mediaUrls).length} media file(s)
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No posts yet</p>
                <p className="text-sm mt-1">Create your first social media post to get started</p>
                {!isReadOnly && (
                  <Link href="/social/new">
                    <Button className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Post
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
