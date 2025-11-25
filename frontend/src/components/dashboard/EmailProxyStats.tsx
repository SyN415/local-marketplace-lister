import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Shield, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { emailKeys } from '@/lib/query-keys';

interface EmailStats {
  hasProxyEmail: boolean;
  proxyEmail: string | null;
  assignedAt: string | null;
  totalReceived: number;
  totalForwarded: number;
  spamBlocked: number;
  last7Days: {
    received: number;
  };
}

export function EmailProxyStats() {
  const { data: stats, isLoading, error } = useQuery<EmailStats>({
    queryKey: emailKeys.stats,
    queryFn: async () => {
      const response = await api.get('/email-stats');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Proxy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load email stats</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats?.hasProxyEmail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Proxy
          </CardTitle>
          <CardDescription>Protect your email with our proxy service</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium">No proxy email assigned</p>
              <p className="text-sm text-muted-foreground">
                Connect your Craigslist account in Settings to get a secure proxy email
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Proxy
        </CardTitle>
        <CardDescription>Your secure email for Craigslist listings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Proxy Email Display */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <code className="text-sm font-mono">{stats.proxyEmail}</code>
          </div>
          <Badge variant="secondary">Active</Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 border rounded-lg">
            <p className="text-2xl font-bold">{stats.last7Days.received}</p>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <p className="text-2xl font-bold">{stats.totalForwarded}</p>
            <p className="text-xs text-muted-foreground">Forwarded</p>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Shield className="h-4 w-4 text-green-500" />
              <p className="text-2xl font-bold">{stats.spamBlocked}</p>
            </div>
            <p className="text-xs text-muted-foreground">Spam blocked</p>
          </div>
        </div>

        {/* Assigned Date */}
        {stats.assignedAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              Active since {new Date(stats.assignedAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}