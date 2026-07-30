export interface Employee {
  kind: "Employee";
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  status: "Active" | "Inactive";
  timeZoneId: string;
}

export interface ForecastGroup {
  kind: "ForecastGroup";
  id: string;
  organizationId: string;
  code: string;
  description: string;
}

export interface IntraDayPerformance {
  kind: "IntraDayPerformance";
  id: string;
  organizationId: string;
  forecastGroupId: string;
  intervalStart: string;
  forecastVolume: number;
  actualVolume: number;
  scheduledAgents: number;
  actualAgents: number;
  serviceLevel: number;
}

export const employees: Employee[] = [
  {
    kind: "Employee",
    id: "-100000001",
    organizationId: "acme-financial",
    firstName: "Jordan",
    lastName: "Lee",
    employeeNumber: "ACME-1001",
    status: "Active",
    timeZoneId: "America/New_York"
  },
  {
    kind: "Employee",
    id: "-100000002",
    organizationId: "acme-financial",
    firstName: "Morgan",
    lastName: "Reed",
    employeeNumber: "ACME-1002",
    status: "Active",
    timeZoneId: "America/Chicago"
  },
  {
    kind: "Employee",
    id: "-200000001",
    organizationId: "northstar-health",
    firstName: "Taylor",
    lastName: "Brooks",
    employeeNumber: "NORTH-2001",
    status: "Active",
    timeZoneId: "America/New_York"
  }
];

export const forecastGroups: ForecastGroup[] = [
  {
    kind: "ForecastGroup",
    id: "-300000001",
    organizationId: "acme-financial",
    code: "ACME-CUSTOMER-SERVICE",
    description: "Acme customer service"
  },
  {
    kind: "ForecastGroup",
    id: "-400000001",
    organizationId: "northstar-health",
    code: "NORTH-PATIENT-SUPPORT",
    description: "Northstar patient support"
  }
];

export const intraDayPerformance: IntraDayPerformance[] = [
  {
    kind: "IntraDayPerformance",
    id: "idp-1001",
    organizationId: "acme-financial",
    forecastGroupId: "-300000001",
    intervalStart: "2026-07-30T02:00:00Z",
    forecastVolume: 520,
    actualVolume: 547,
    scheduledAgents: 82,
    actualAgents: 78,
    serviceLevel: 91.4
  },
  {
    kind: "IntraDayPerformance",
    id: "idp-2001",
    organizationId: "northstar-health",
    forecastGroupId: "-400000001",
    intervalStart: "2026-07-30T02:00:00Z",
    forecastVolume: 310,
    actualVolume: 294,
    scheduledAgents: 51,
    actualAgents: 49,
    serviceLevel: 94.1
  }
];

export interface SecurityEvent {
  id: string;
  organizationId: string;
  integrationId: string;
  title: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  sourceIp: string;
  requestCount: number;
  normalRequestCount: number;
  status: "Open" | "Investigating" | "Contained";
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  organizationId: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
}

export const securityEvents: SecurityEvent[] = [
  {
    id: "event-1001",
    organizationId: "acme-financial",
    integrationId: "integration-reporting-prod",
    title: "Unusual API request volume",
    severity: "High",
    sourceIp: "203.0.113.48",
    requestCount: 847,
    normalRequestCount: 20,
    status: "Open",
    createdAt: new Date().toISOString()
  }
];

export const auditEntries: AuditEntry[] = [];