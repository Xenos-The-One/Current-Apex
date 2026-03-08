import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Phone, Mail, CheckCircle2, Clock, Gift } from "lucide-react";
import { toast } from "sonner";

import DashboardLayout from "@/components/DashboardLayout";
export default function Birthdays() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  const { data: upcomingBirthdays, isLoading: loadingUpcoming } = trpc.birthdays.getUpcoming.useQuery();
  const { data: monthBirthdays, isLoading: loadingMonth } = trpc.birthdays.getByMonth.useQuery({ month: selectedMonth });
  const { data: settings } = trpc.birthdays.getSettings.useQuery();

  const checkNow = trpc.birthdays.checkNow.useMutation({
    onSuccess: (data) => {
      toast.success(`Birthday check completed! ${data.notificationsSent} notifications sent.`);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const approveVideo = trpc.birthdays.approveVideo.useMutation({
    onSuccess: () => {
      toast.success("Birthday video approved!");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const formatBirthday = (date: Date | null) => {
    if (!date) return "Not set";
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
  };

  const getDaysUntil = (birthday: Date | null) => {
    if (!birthday) return null;
    const today = new Date();
    const bday = new Date(birthday);
    const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
    
    if (thisYear < today) {
      thisYear.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = thisYear.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Birthday Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Automated birthday reminders for Timisha's clients
          </p>
        </div>
        <Button
          onClick={() => checkNow.mutate()}
          disabled={checkNow.isPending}
        >
          <Clock className="w-4 h-4 mr-2" />
          {checkNow.isPending ? "Checking..." : "Check Now"}
        </Button>
      </div>

      {/* Settings Card */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notification Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Days in advance:</span>
              <Badge variant="secondary">{settings.daysInAdvance} days</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Timisha's phone:</span>
              <Badge variant="secondary">{settings.timishaPhone}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Check schedule:</span>
              <Badge variant="secondary">Daily at 9:00 AM</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Birthdays (Next 30 Days) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Upcoming Birthdays (Next 30 Days)
          </CardTitle>
          <CardDescription>
            Timisha will receive SMS notifications 3 days before each birthday
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUpcoming ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !upcomingBirthdays || upcomingBirthdays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No upcoming birthdays in the next 30 days
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBirthdays.map((birthday) => {
                const daysUntil = getDaysUntil(birthday.birthday);
                return (
                  <DashboardLayout>
      <div
                    key={birthday.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-semibold">
                            {birthday.firstName} {birthday.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatBirthday(birthday.birthday)}
                            {daysUntil !== null && (
                              <span className="ml-2">
                                ({daysUntil === 0 ? "Today!" : `in ${daysUntil} days`})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 ml-8 text-sm text-muted-foreground">
                        {birthday.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {birthday.phone}
                          </div>
                        )}
                        {birthday.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {birthday.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {birthday.birthdayNotificationSent && (
                        <Badge variant="secondary">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Notified
                        </Badge>
                      )}
                      {birthday.birthdayVideoApproved && (
                        <Badge variant="default">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Approved
                        </Badge>
                      )}
                      {!birthday.birthdayVideoApproved && birthday.birthdayNotificationSent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveVideo.mutate({ leadId: birthday.id })}
                        >
                          Approve Video
                        </Button>
                      )}
                    </div>
                  </div>
    </DashboardLayout>
  );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly View */}
      <Card>
        <CardHeader>
          <CardTitle>View by Month</CardTitle>
          <CardDescription>Select a month to see all birthdays</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Month Selector */}
          <div className="flex flex-wrap gap-2">
            {months.map((month, index) => (
              <Button
                key={month}
                variant={selectedMonth === index + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMonth(index + 1)}
              >
                {month}
              </Button>
            ))}
          </div>

          {/* Month Birthdays List */}
          {loadingMonth ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !monthBirthdays || monthBirthdays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No birthdays in {months[selectedMonth - 1]}
            </div>
          ) : (
            <div className="space-y-2">
              {monthBirthdays.map((birthday) => (
                <div
                  key={birthday.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {birthday.firstName} {birthday.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatBirthday(birthday.birthday)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {birthday.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {birthday.phone}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary">1</span>
            </div>
            <div>
              <p className="font-medium">Daily Check at 9 AM</p>
              <p className="text-sm text-muted-foreground">
                System automatically checks for birthdays happening in 3 days
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary">2</span>
            </div>
            <div>
              <p className="font-medium">SMS to Timisha</p>
              <p className="text-sm text-muted-foreground">
                Timisha receives SMS with client name, birthday, phone, and email
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary">3</span>
            </div>
            <div>
              <p className="font-medium">Create HeyGen Video</p>
              <p className="text-sm text-muted-foreground">
                Timisha has 3 days to create personalized birthday video in HeyGen
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary">4</span>
            </div>
            <div>
              <p className="font-medium">Approve & Send</p>
              <p className="text-sm text-muted-foreground">
                Reply "APPROVE" to SMS or click button above to send video on birthday
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
}
