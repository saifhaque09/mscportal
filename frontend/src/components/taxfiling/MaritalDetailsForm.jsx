import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";

export function MaritalDetailsForm() {
  return (
    <Card className="max-w-2xl mx-auto mt-6">
      <CardHeader>
        <CardTitle>Spouse/Partner Details</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Use div instead of form to avoid nesting */}
        <div
          className="space-y-6"
          role="group"
          aria-labelledby="partner-details-heading"
        >
          <div className="space-y-2">
            <Label htmlFor="partnerFullName">Full Name</Label>
            <Input
              id="partnerFullName"
              name="partnerFullName"
              placeholder="Full Name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="partnerSIN">Social Insurance Number (SIN)</Label>
            <Input
              id="partnerSIN"
              name="partnerSIN"
              placeholder="SIN"
              maxLength={9}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="partnerDOB">Date of Birth</Label>
            <div className="relative">
              <Input
                id="partnerDOB"
                name="partnerDOB"
                type="date"
                placeholder="Select Date"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="partnerNetIncome">Net Income (CAD)</Label>
            <Input
              id="partnerNetIncome"
              name="partnerNetIncome"
              type="number"
              placeholder="Net Income"
              min={0}
              step={0.01}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
