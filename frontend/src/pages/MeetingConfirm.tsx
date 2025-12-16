import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

export default function MeetingConfirm() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [meeting, setMeeting] = useState<any>(null);

  const { data: meetingData } = trpc.outreach.getMeetingByToken.useQuery(
    { token: token! },
    { enabled: !!token }
  );

  const confirmMutation = trpc.outreach.confirmMeetingByToken.useMutation({
    onSuccess: () => {
      setStatus("success");
    },
    onError: () => {
      setStatus("error");
    },
  });

  useEffect(() => {
    if (meetingData) {
      setMeeting(meetingData);
      // Auto-confirm when page loads
      if (meetingData.status !== "confirmed" && meetingData.status !== "completed") {
        confirmMutation.mutate({ token: token! });
      } else {
        // Already confirmed
        setStatus("success");
      }
    }
  }, [meetingData, token]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              </div>
              <CardTitle>Confirmando...</CardTitle>
              <CardDescription>Aguarde um momento</CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-green-700">Presença Confirmada!</CardTitle>
              <CardDescription>Obrigado por confirmar sua presença</CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-red-700">Erro</CardTitle>
              <CardDescription>Não foi possível confirmar. O link pode ter expirado.</CardDescription>
            </>
          )}
        </CardHeader>

        {status === "success" && meeting && (
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm">
                <strong>Data:</strong> {formatDate(meeting.scheduled_at)}
              </p>
              <p className="text-sm">
                <strong>Horário:</strong> {formatTime(meeting.scheduled_at)}
              </p>
              {meeting.contact_name && (
                <p className="text-sm">
                  <strong>Contato:</strong> {meeting.contact_name}
                </p>
              )}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Aguardamos você na data marcada!
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
