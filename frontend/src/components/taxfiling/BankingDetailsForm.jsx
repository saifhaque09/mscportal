import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function BankingDetailsForm() {
  return (
    <Card className="max-w-2xl mx-auto mt-6">
      <CardHeader>
        <CardTitle>Banking Details (Direct Deposit)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Provide banking information for tax refunds and payments
        </p>
      </CardHeader>
      <CardContent>
        {/* Use div instead of form to avoid nesting issues */}
        <div
          className="space-y-6"
          role="group"
          aria-labelledby="banking-details-heading"
        >
          <Alert>
            <AlertDescription className="text-sm">
              Find these details on a cheque: Institution (bottom left, 3
              digits), Transit (next 5 digits), Account (right side).
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="institutionNumber">Institution Number</Label>
              <Input
                id="institutionNumber"
                name="institutionNumber"
                placeholder="001"
                maxLength={3}
                type="text"
                pattern="[0-9]{3}"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transitNumber">Transit Number</Label>
              <Input
                id="transitNumber"
                name="transitNumber"
                placeholder="12345"
                maxLength={5}
                type="text"
                pattern="[0-9]{5}"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                name="accountNumber"
                placeholder="123456789"
                maxLength={12}
                type="text"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountHolderName">Account Holder Name</Label>
            <Input
              id="accountHolderName"
              name="accountHolderName"
              placeholder="Full name as on bank account"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountType">Account Type</Label>
            <Select defaultValue="chequing">
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Account Type</SelectLabel>
                  <SelectItem value="chequing">Chequing</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="directDepositConsent" name="directDepositConsent" />
            <Label
              htmlFor="directDepositConsent"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I authorize direct deposit of refunds and benefits to this account
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
