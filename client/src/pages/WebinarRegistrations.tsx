import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Video, Search, Users, CheckCircle2, XCircle, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function WebinarRegistrations() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: registrations, isLoading } = (trpc.webinars as any).list?.useQuery?.() ?? { data: undefined, isLoading: false };

  const filteredRegistrations = registrations?.filter((reg: any) => {
    const query = searchQuery.toLowerCase();
    return (
      reg.firstName.toLowerCase().includes(query) ||
      reg.lastName.toLowerCase().includes(query) ||
      reg.email.toLowerCase().includes(query) ||
      reg.phone.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: registrations?.length || 0,
    registered: registrations?.filter((r: any) => r.status === "registered").length || 0,
    confirmed: registrations?.filter((r: any) => r.status === "confirmed").length || 0,
    attended: registrations?.filter((r: any) => r.status === "attended").length || 0,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      registered: { variant: "secondary", icon: Clock },
      confirmed: { variant: "default", icon: CheckCircle2 },
      attended: { variant: "default", icon: CheckCircle2 },
      no_show: { variant: "destructive", icon: XCircle },
      cancelled: { variant: "outline", icon: XCircle },
    };

    const config = variants[status] || variants.registered;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="container py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Video className="h-8 w-8" />
              Webinar Registrations
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and track webinar attendees
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registered</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.registered}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.confirmed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attended</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.attended}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading registrations...</div>
              </div>
            ) : filteredRegistrations && filteredRegistrations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Webinar</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((reg: any) => (
                    <TableRow key={reg.id}>
                      <TableCell className="font-medium">
                        {reg.firstName} {reg.lastName}
                      </TableCell>
                      <TableCell>{reg.email}</TableCell>
                      <TableCell>{reg.phone}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {reg.webinarTitle}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(new Date(reg.webinarDate), "MMM d, yyyy h:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(reg.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(reg.createdAt), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-1">No registrations found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Webinar registrations will appear here"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
