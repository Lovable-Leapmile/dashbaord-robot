import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Globe, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ApiTesterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ApiTesterModal = ({ open, onOpenChange }: ApiTesterModalProps) => {
  const [apiName, setApiName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  // Validate format: apiname.domain (e.g., login.qikpod.com)
  const validateApiFormat = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "API name is required";
    }
    
    // Format: subdomain.domain.tld (at least two dots for subdomain.domain.tld pattern)
    // Or subdomain.domain pattern
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;
    
    if (!domainPattern.test(trimmed)) {
      return "Invalid format. Use: apiname.domain (e.g., login.qikpod.com)";
    }

    // Check minimum parts (at least subdomain.domain)
    const parts = trimmed.split(".");
    if (parts.length < 2) {
      return "Invalid format. Use: apiname.domain (e.g., login.qikpod.com)";
    }

    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setApiName(value);
    setTestResult(null);
    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateApiFormat(apiName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError("");
    setTestResult(null);

    try {
      const trimmedApi = apiName.trim();
      const apiUrl = `https://${trimmedApi}`;
      
      // Test the API endpoint
      const response = await fetch(apiUrl, {
        method: "HEAD",
        mode: "no-cors",
      });

      // Since no-cors doesn't give us status, we assume success if no error thrown
      setTestResult("success");
      
      // Store the new API configuration
      const apiNamePart = trimmedApi.split(".")[0];
      const API_CONFIG_KEY = "api_config";
      const config = { apiName: apiNamePart, baseUrl: apiUrl };
      localStorage.setItem(API_CONFIG_KEY, JSON.stringify(config));

      toast({
        title: "API Configured",
        description: `Successfully configured API: ${trimmedApi}`,
      });

      // Close modal after short delay
      setTimeout(() => {
        onOpenChange(false);
        setApiName("");
        setTestResult(null);
      }, 1000);
      
    } catch (err) {
      setTestResult("error");
      setError("Failed to connect to the API. Please check the URL and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setApiName("");
    setError("");
    setTestResult(null);
    onOpenChange(false);
  };

  const isValid = apiName.trim().length > 0 && !validateApiFormat(apiName);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold">API Tester</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-domain" className="text-sm font-semibold">
              API Name
            </Label>
            <Input
              id="api-domain"
              type="text"
              value={apiName}
              onChange={handleInputChange}
              className={`w-full ${
                error ? "border-destructive focus:border-destructive" : ""
              } ${testResult === "success" ? "border-green-500 focus:border-green-500" : ""}`}
              placeholder="apiname.domain (e.g., login.qikpod.com)"
              autoComplete="off"
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                {error}
              </p>
            )}
            {testResult === "success" && !error && (
              <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                API connection successful!
              </p>
            )}
            {apiName.trim() && !error && !testResult && (
              <p className="text-xs text-muted-foreground mt-1">
                Will connect to: <span className="font-mono text-primary">https://{apiName.trim()}</span>
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              style={{ backgroundColor: '#351C75' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApiTesterModal;
