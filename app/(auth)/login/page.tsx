import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LoginForm from "@/components/shared/LoginForm";
import StudioLogo from "@/components/shared/StudioLogo";

export default function LoginPage() {
  return (
    <Card className="bg-charcoal-900/90 border-charcoal-700 backdrop-blur-sm shadow-2xl">
      <CardHeader className="text-center space-y-4">
        <div className="flex justify-center">
          <StudioLogo size={80} />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold text-white">
            Snap &amp; Print Studio
          </CardTitle>
          <CardDescription className="text-charcoal-400 mt-1">
            Sign in to manage your studio
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
