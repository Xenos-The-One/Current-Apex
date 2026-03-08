import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Activity,
  Mail,
  MessageSquare,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  Eye,
  MousePointerClick,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

export default function CampaignMonitoring() {
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('today');

  // Query campaigns
  const { data: campaigns, isLoading: campaignsLoading } = trpc.campaigns.list.useQuery({
    agencyId: 1,
    dateRange,
  });

  // Query campaign messages
  const { data: messages, isLoading: messagesLoading } = trpc.campaigns.getMessages.useQuery({
    campaignId: selectedCampaign === 'all' ? undefined : parseInt(selectedCampaign),
    dateRange,
  });

  // Query campaign stats
  const { data: stats } = trpc.campaigns.getStats.useQuery({
    agencyId: 1,
    dateRange,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return 'bg-green-500';
      case 'sent':
        return 'bg-blue-500';
      case 'opened':
        return 'bg-purple-500';
      case 'clicked':
        return 'bg-indigo-500';
      case 'failed':
      case 'bounced':
        return 'bg-red-500';
      case 'queued':
      case 'scheduled':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4" />;
      case 'vapi_call':
        return <Phone className="w-4 h-4" />;
      case 'webinar':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Campaign Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time visibility into all marketing communications
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{stats?.totalSent || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{stats?.delivered || 0}</p>
                <p className="text-xs text-green-600">
                  {stats?.deliveryRate || 0}% rate
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Opened</p>
                <p className="text-2xl font-bold">{stats?.opened || 0}</p>
                <p className="text-xs text-purple-600">
                  {stats?.openRate || 0}% rate
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{stats?.failed || 0}</p>
                <p className="text-xs text-red-600">
                  {stats?.failureRate || 0}% rate
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Campaign</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns?.map((campaign: any) => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="all_time">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                Export Report
              </Button>
            </div>
          </div>
        </Card>

        {/* Active Campaigns */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Active Campaigns</h2>
          {campaignsLoading ? (
            <p className="text-muted-foreground">Loading campaigns...</p>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="space-y-4">
              {campaigns.map((campaign: any) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      {getTypeIcon(campaign.type)}
                    </div>
                    <div>
                      <p className="font-semibold">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {campaign.totalRecipients} recipients
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {campaign.successfulSends}/{campaign.totalRecipients} sent
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {campaign.failedSends} failed
                      </p>
                    </div>
                    <Badge className={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No campaigns found</p>
            </div>
          )}
        </Card>

        {/* Message Delivery Log */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Message Delivery Log</h2>
          {messagesLoading ? (
            <p className="text-muted-foreground">Loading messages...</p>
          ) : messages && messages.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Recipient</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Sent</th>
                    <th className="text-left p-2">Delivered</th>
                    <th className="text-left p-2">Opened</th>
                    <th className="text-left p-2">Clicked</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((message: any) => (
                    <tr key={message.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(message.messageType)}
                          <span className="text-sm">{message.messageType}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          <p className="text-sm font-medium">{message.recipientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {message.recipientEmail || message.recipientPhone}
                          </p>
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge className={getStatusColor(message.status)}>
                          {message.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-sm">
                        {message.sentAt ? new Date(message.sentAt).toLocaleString() : '-'}
                      </td>
                      <td className="p-2 text-sm">
                        {message.deliveredAt ? new Date(message.deliveredAt).toLocaleString() : '-'}
                      </td>
                      <td className="p-2 text-sm">
                        {message.openedAt ? new Date(message.openedAt).toLocaleString() : '-'}
                      </td>
                      <td className="p-2 text-sm">
                        {message.clickedAt ? new Date(message.clickedAt).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No messages found</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
