"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ListingPageLayout from "@/components/layout/ListingPageLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserPlus,
  Users,
  Wallet,
  Download,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Calendar,
  DollarSign,
} from "lucide-react";

// Mock data
const mockEmployees = [
  {
    id: "emp-1",
    firstName: "John",
    lastName: "Doe",
    midName: "Michael",
    sinNumber: "***-***-123",
    joiningDate: "2025-01-15",
    email: "john.doe@example.com",
    hourlyPay: 25.5,
    status: "active",
  },
  {
    id: "emp-2",
    firstName: "Sarah",
    lastName: "Smith",
    sinNumber: "***-***-456",
    joiningDate: "2025-03-20",
    email: "sarah.smith@example.com",
    hourlyPay: 30.0,
    status: "active",
  },
  {
    id: "emp-3",
    firstName: "Michael",
    lastName: "Johnson",
    midName: "Robert",
    sinNumber: "***-***-789",
    joiningDate: "2025-11-10",
    terminationDate: "2025-08-15",
    email: "michael.johnson@example.com",
    hourlyPay: 28.75,
    status: "terminated",
  },
  {
    id: "emp-4",
    firstName: "Emily",
    lastName: "Williams",
    sinNumber: "***-***-321",
    joiningDate: "2025-05-01",
    email: "emily.williams@example.com",
    hourlyPay: 32.0,
    status: "active",
  },
];

const generateMockPayrollData = (period) => {
  return mockEmployees
    .filter((emp) => emp.status === "active")
    .map((emp) => {
      const hoursWorked = Math.floor(Math.random() * 80) + 120; // 120-200 hours
      return {
        id: `payroll-${emp.id}-${period}`,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        sinNumber: emp.sinNumber,
        hourlyPay: emp.hourlyPay || 25,
        totalHoursWorked: hoursWorked,
        grossPay: (emp.hourlyPay || 25) * hoursWorked,
        payPeriod: period,
        payDate: new Date().toISOString().split("T")[0],
      };
    });
};

export default function PayrollPage() {
  const [activeTab, setActiveTab] = React.useState("employee-list");
  const [employees, setEmployees] = React.useState(mockEmployees);

  // Employee Modal States
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = React.useState(false);
  const [employeeForm, setEmployeeForm] = React.useState({
    firstName: "",
    lastName: "",
    midName: "",
    sinNumber: "",
    joiningDate: "",
    terminationDate: "",
    email: "",
    hourlyPay: "",
  });

  // Payroll States
  const [selectedPayPeriod, setSelectedPayPeriod] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [payrollData, setPayrollData] = React.useState(
    generateMockPayrollData(selectedPayPeriod)
  );

  // Payroll Add Employee Modal
  const [isPayrollAddModalOpen, setIsPayrollAddModalOpen] =
    React.useState(false);
  const [payrollForm, setPayrollForm] = React.useState({
    employeeId: "",
    totalHoursWorked: "",
  });

  // Generate pay period options
  const getPayPeriodOptions = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const periods = [];

    for (let year = currentYear; year >= currentYear - 1; year--) {
      for (let month = 12; month >= 1; month--) {
        if (year === currentYear && month > currentMonth) continue;
        periods.push({
          value: `${year}-${String(month).padStart(2, "0")}`,
          label: new Date(year, month - 1).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
        });
      }
    }
    return periods;
  };

  const payPeriodOptions = getPayPeriodOptions();

  React.useEffect(() => {
    setPayrollData(generateMockPayrollData(selectedPayPeriod));
  }, [selectedPayPeriod]);

  // Employee Management Functions
  const handleAddEmployee = () => {
    if (
      !employeeForm.firstName ||
      !employeeForm.lastName ||
      !employeeForm.email
    ) {
      alert("Please fill in all required fields");
      return;
    }

    const newEmployee = {
      id: `emp-${Date.now()}`,
      firstName: employeeForm.firstName,
      lastName: employeeForm.lastName,
      midName: employeeForm.midName,
      sinNumber: `***-***-${Math.floor(Math.random() * 900) + 100}`,
      joiningDate: employeeForm.joiningDate,
      terminationDate: employeeForm.terminationDate || undefined,
      email: employeeForm.email,
      hourlyPay: parseFloat(employeeForm.hourlyPay) || undefined,
      status: employeeForm.terminationDate ? "terminated" : "active",
    };

    setEmployees([...employees, newEmployee]);

    // Reset form
    setEmployeeForm({
      firstName: "",
      lastName: "",
      midName: "",
      sinNumber: "",
      joiningDate: "",
      terminationDate: "",
      email: "",
      hourlyPay: "",
    });
    setIsEmployeeModalOpen(false);
    alert("Employee added successfully!");
  };

  const handleDeleteEmployee = (id) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      setEmployees(employees.filter((emp) => emp.id !== id));
      alert("Employee deleted successfully");
    }
  };

  // Payroll Functions
  const handleAddToPayroll = () => {
    if (!payrollForm.employeeId || !payrollForm.totalHoursWorked) {
      alert("Please fill in all required fields");
      return;
    }

    const employee = employees.find((emp) => emp.id === payrollForm.employeeId);
    if (!employee) return;

    const hoursWorked = parseFloat(payrollForm.totalHoursWorked);
    const hourlyPay = employee.hourlyPay || 25;

    const newPayrollEntry = {
      id: `payroll-${Date.now()}`,
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      sinNumber: employee.sinNumber,
      hourlyPay,
      totalHoursWorked: hoursWorked,
      grossPay: hourlyPay * hoursWorked,
      payPeriod: selectedPayPeriod,
      payDate: new Date().toISOString().split("T")[0],
    };

    setPayrollData([...payrollData, newPayrollEntry]);

    // Reset form
    setPayrollForm({
      employeeId: "",
      totalHoursWorked: "",
    });
    setIsPayrollAddModalOpen(false);
    alert("Employee added to payroll successfully!");
  };

  const handleDownloadPayslip = (entry) => {
    console.log("Downloading payslip for:", entry.employeeName);
    alert(`Downloading payslip for ${entry.employeeName}`);
  };

  const activeEmployees = employees.filter((emp) => emp.status === "active");
  const terminatedEmployees = employees.filter(
    (emp) => emp.status === "terminated"
  );

  const statsIntro = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{employees.length}</div>
          <p className="text-xs text-muted-foreground">Total Employees</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-green-600">
            {activeEmployees.length}
          </div>
          <p className="text-xs text-muted-foreground">Active</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-red-600">
            {terminatedEmployees.length}
          </div>
          <p className="text-xs text-muted-foreground">Terminated</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-blue-600">
            {payrollData.length}
          </div>
          <p className="text-xs text-muted-foreground">Payroll Entries</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <ProtectedRoute allowedRoles={["accountant", "admin"]}>
    <ListingPageLayout
      title="Payroll Management"
      subtitle="Manage employees and process payroll"
      intro={statsIntro}
      bordered={false}
    >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="employee-list" className="gap-2">
              <Users className="h-4 w-4" />
              Employee List
            </TabsTrigger>
            <TabsTrigger value="payroll" className="gap-2">
              <Wallet className="h-4 w-4" />
              Payroll
            </TabsTrigger>
          </TabsList>

          {/* Employee List Tab */}
          <TabsContent value="employee-list" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Employee List</CardTitle>
                    <CardDescription>
                      Manage your employee information
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setIsEmployeeModalOpen(true)}
                    className="gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Employee
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>SIN Number (encoded)</TableHead>
                        <TableHead>Joining Date</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No employees found. Add your first employee to get
                            started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        employees.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {employee.firstName}{" "}
                                  {employee.midName && `${employee.midName} `}
                                  {employee.lastName}
                                </div>
                                {employee.hourlyPay && (
                                  <div className="text-xs text-muted-foreground">
                                    ${employee.hourlyPay.toFixed(2)}/hr
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">
                                {employee.sinNumber}
                              </span>
                            </TableCell>
                            <TableCell>
                              {new Date(
                                employee.joiningDate
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{employee.email}</TableCell>
                            <TableCell>
                              {employee.status === "active" ? (
                                <Badge className="bg-green-100 text-green-800">
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800">
                                  Terminated
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDeleteEmployee(employee.id)
                                    }
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Payroll</CardTitle>
                    <CardDescription>
                      Manage employee payroll for selected period
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select
                      value={selectedPayPeriod}
                      onValueChange={setSelectedPayPeriod}
                    >
                      <SelectTrigger className="w-[200px]">
                        <Calendar className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Select pay period" />
                      </SelectTrigger>
                      <SelectContent>
                        {payPeriodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => setIsPayrollAddModalOpen(true)}
                      className="gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add Employee
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>SIN Number (encoded)</TableHead>
                        <TableHead>Hourly Pay</TableHead>
                        <TableHead>Total Worked Hours</TableHead>
                        <TableHead>Gross Pay</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollData.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No payroll entries for this period. Add employees to
                            the payroll.
                          </TableCell>
                        </TableRow>
                      ) : (
                        payrollData.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <div className="font-medium">
                                {entry.employeeName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">
                                {entry.sinNumber}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-muted-foreground" />
                                <span>{entry.hourlyPay.toFixed(2)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">
                                {entry.totalHoursWorked} hrs
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 font-semibold text-green-600">
                                <DollarSign className="h-4 w-4" />
                                <span>{entry.grossPay.toFixed(2)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadPayslip(entry)}
                                className="gap-2"
                              >
                                <Download className="h-4 w-4" />
                                Download Payslip
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Payroll Summary */}
                {payrollData.length > 0 && (
                  <div className="mt-6 flex justify-end">
                    <Card className="w-full max-w-sm">
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Total Employees:
                            </span>
                            <span className="font-medium">
                              {payrollData.length}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Total Hours:
                            </span>
                            <span className="font-medium">
                              {payrollData.reduce(
                                (sum, entry) => sum + entry.totalHoursWorked,
                                0
                              )}{" "}
                              hrs
                            </span>
                          </div>
                          <div className="border-t pt-2 flex justify-between">
                            <span className="font-semibold">
                              Total Gross Pay:
                            </span>
                            <span className="font-bold text-green-600 flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {payrollData
                                .reduce((sum, entry) => sum + entry.grossPay, 0)
                                .toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      {/* Add Employee Modal */}
      <Dialog open={isEmployeeModalOpen} onOpenChange={setIsEmployeeModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Enter employee information. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={employeeForm.firstName}
                  onChange={(e) =>
                    setEmployeeForm({
                      ...employeeForm,
                      firstName: e.target.value,
                    })
                  }
                  placeholder="John"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={employeeForm.lastName}
                  onChange={(e) =>
                    setEmployeeForm({
                      ...employeeForm,
                      lastName: e.target.value,
                    })
                  }
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="midName">Middle Name</Label>
              <Input
                id="midName"
                value={employeeForm.midName}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, midName: e.target.value })
                }
                placeholder="Michael"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sinNumber">SIN Number</Label>
              <Input
                id="sinNumber"
                value={employeeForm.sinNumber}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    sinNumber: e.target.value,
                  })
                }
                placeholder="123-456-789"
                maxLength={11}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="joiningDate">
                  Joining Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="joiningDate"
                  type="date"
                  value={employeeForm.joiningDate}
                  onChange={(e) =>
                    setEmployeeForm({
                      ...employeeForm,
                      joiningDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="terminationDate">Termination Date</Label>
                <Input
                  id="terminationDate"
                  type="date"
                  value={employeeForm.terminationDate}
                  onChange={(e) =>
                    setEmployeeForm({
                      ...employeeForm,
                      terminationDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={employeeForm.email}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, email: e.target.value })
                }
                placeholder="john.doe@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hourlyPay">Hourly Pay</Label>
              <Input
                id="hourlyPay"
                type="number"
                step="0.01"
                value={employeeForm.hourlyPay}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    hourlyPay: e.target.value,
                  })
                }
                placeholder="25.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEmployeeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddEmployee}>Add Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Payroll Modal */}
      <Dialog
        open={isPayrollAddModalOpen}
        onOpenChange={setIsPayrollAddModalOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Employee to Payroll</DialogTitle>
            <DialogDescription>
              Select an employee and enter hours worked for this pay period.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="employeeId">
                Employee Name <span className="text-destructive">*</span>
              </Label>
              <Select
                value={payrollForm.employeeId}
                onValueChange={(value) =>
                  setPayrollForm({ ...payrollForm, employeeId: value })
                }
              >
                <SelectTrigger id="employeeId">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} - $
                      {emp.hourlyPay?.toFixed(2) || "N/A"}/hr
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="totalHoursWorked">
                Total Hours Worked <span className="text-destructive">*</span>
              </Label>
              <Input
                id="totalHoursWorked"
                type="number"
                step="0.5"
                value={payrollForm.totalHoursWorked}
                onChange={(e) =>
                  setPayrollForm({
                    ...payrollForm,
                    totalHoursWorked: e.target.value,
                  })
                }
                placeholder="160"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPayrollAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddToPayroll}>Add to Payroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ListingPageLayout>
    </ProtectedRoute>
  );
}
