// Organization-Type-Sensitive People Schema Configuration
// This defines dynamic fields based on organization type

export type OrgType = "church" | "school" | "workplace" | "event" | "ngo" | "other";

export interface FieldConfig {
  key: string;
  label: string;
  placeholder?: string;
  type: "text" | "email" | "phone" | "select" | "date";
  required?: boolean;
  options?: { value: string; label: string }[];
  helpText?: string;
}

export interface OrgTypeConfig {
  id: OrgType;
  name: string;
  personLabel: string; // What to call a person (e.g., "Member", "Student", "Employee")
  personLabelPlural: string;
  primaryIdLabel: string; // What to call the primary ID (e.g., "Member ID", "Student ID")
  fields: FieldConfig[];
  groupLabel: string; // What to call groups (e.g., "Ministry", "Class", "Department")
  groupLabelPlural: string;
}

// Core fields that apply to all organization types
export const CORE_FIELDS: FieldConfig[] = [
  {
    key: "full_name",
    label: "Full Name",
    placeholder: "Enter full name",
    type: "text",
    required: true,
  },
  {
    key: "email",
    label: "Email",
    placeholder: "email@example.com",
    type: "email",
    required: false,
  },
  {
    key: "phone",
    label: "Phone",
    placeholder: "+1 234 567 8900",
    type: "phone",
    required: false,
  },
];

// Organization-specific configurations
export const ORG_TYPE_CONFIGS: Record<OrgType, OrgTypeConfig> = {
  church: {
    id: "church",
    name: "Church / Ministry",
    personLabel: "Member",
    personLabelPlural: "Members",
    primaryIdLabel: "Member ID",
    groupLabel: "Ministry",
    groupLabelPlural: "Ministries",
    fields: [
      {
        key: "membership_type",
        label: "Membership Type",
        type: "select",
        options: [
          { value: "member", label: "Member" },
          { value: "visitor", label: "Visitor" },
          { value: "regular_attendee", label: "Regular Attendee" },
          { value: "leader", label: "Leader" },
        ],
      },
      {
        key: "ministry",
        label: "Primary Ministry",
        placeholder: "e.g., Choir, Ushering, Youth",
        type: "text",
      },
      {
        key: "join_date",
        label: "Date Joined",
        type: "date",
      },
    ],
  },
  school: {
    id: "school",
    name: "School / Training",
    personLabel: "Student",
    personLabelPlural: "Students",
    primaryIdLabel: "Student ID",
    groupLabel: "Class",
    groupLabelPlural: "Classes",
    fields: [
      {
        key: "student_id",
        label: "Student ID",
        placeholder: "e.g., STU-2024-001",
        type: "text",
      },
      {
        key: "class_grade",
        label: "Class / Grade",
        placeholder: "e.g., Grade 10, Year 2",
        type: "text",
      },
      {
        key: "guardian_name",
        label: "Guardian Name",
        placeholder: "Parent or guardian name",
        type: "text",
      },
      {
        key: "guardian_phone",
        label: "Guardian Phone",
        placeholder: "Guardian contact number",
        type: "phone",
      },
      {
        key: "enrollment_status",
        label: "Enrollment Status",
        type: "select",
        options: [
          { value: "enrolled", label: "Enrolled" },
          { value: "graduated", label: "Graduated" },
          { value: "withdrawn", label: "Withdrawn" },
          { value: "suspended", label: "Suspended" },
        ],
      },
    ],
  },
  workplace: {
    id: "workplace",
    name: "Workplace / Office",
    personLabel: "Employee",
    personLabelPlural: "Employees",
    primaryIdLabel: "Employee ID",
    groupLabel: "Department",
    groupLabelPlural: "Departments",
    fields: [
      {
        key: "employee_id",
        label: "Employee ID",
        placeholder: "e.g., EMP-001",
        type: "text",
      },
      {
        key: "department",
        label: "Department",
        placeholder: "e.g., Engineering, Marketing",
        type: "text",
      },
      {
        key: "job_title",
        label: "Job Title",
        placeholder: "e.g., Software Engineer",
        type: "text",
      },
      {
        key: "work_location",
        label: "Work Location",
        placeholder: "e.g., Main Office, Remote",
        type: "text",
      },
      {
        key: "hire_date",
        label: "Hire Date",
        type: "date",
      },
    ],
  },
  event: {
    id: "event",
    name: "Event / Conference",
    personLabel: "Attendee",
    personLabelPlural: "Attendees",
    primaryIdLabel: "Registration ID",
    groupLabel: "Track",
    groupLabelPlural: "Tracks",
    fields: [
      {
        key: "registration_id",
        label: "Registration ID",
        placeholder: "e.g., REG-2024-001",
        type: "text",
      },
      {
        key: "ticket_type",
        label: "Ticket Type",
        type: "select",
        options: [
          { value: "general", label: "General Admission" },
          { value: "vip", label: "VIP" },
          { value: "speaker", label: "Speaker" },
          { value: "sponsor", label: "Sponsor" },
          { value: "staff", label: "Staff" },
        ],
      },
      {
        key: "company",
        label: "Company / Organization",
        placeholder: "Attendee's company",
        type: "text",
      },
      {
        key: "dietary_requirements",
        label: "Dietary Requirements",
        placeholder: "Any dietary restrictions",
        type: "text",
      },
    ],
  },
  ngo: {
    id: "ngo",
    name: "NGO / Volunteer",
    personLabel: "Volunteer",
    personLabelPlural: "Volunteers",
    primaryIdLabel: "Volunteer ID",
    groupLabel: "Program",
    groupLabelPlural: "Programs",
    fields: [
      {
        key: "volunteer_id",
        label: "Volunteer ID",
        placeholder: "e.g., VOL-001",
        type: "text",
      },
      {
        key: "skills",
        label: "Skills",
        placeholder: "e.g., Teaching, Medical, IT",
        type: "text",
        helpText: "Comma-separated list of skills",
      },
      {
        key: "availability",
        label: "Availability",
        type: "select",
        options: [
          { value: "weekdays", label: "Weekdays" },
          { value: "weekends", label: "Weekends" },
          { value: "flexible", label: "Flexible" },
          { value: "on_call", label: "On Call" },
        ],
      },
      {
        key: "emergency_contact",
        label: "Emergency Contact",
        placeholder: "Name and phone number",
        type: "text",
      },
    ],
  },
  other: {
    id: "other",
    name: "Other",
    personLabel: "Person",
    personLabelPlural: "People",
    primaryIdLabel: "ID",
    groupLabel: "Group",
    groupLabelPlural: "Groups",
    fields: [
      {
        key: "custom_id",
        label: "Custom ID",
        placeholder: "Optional identifier",
        type: "text",
      },
      {
        key: "notes",
        label: "Notes",
        placeholder: "Additional information",
        type: "text",
      },
    ],
  },
};

/**
 * Get the configuration for an organization type
 */
export function getOrgTypeConfig(orgType: OrgType | string | null): OrgTypeConfig {
  if (orgType && orgType in ORG_TYPE_CONFIGS) {
    return ORG_TYPE_CONFIGS[orgType as OrgType];
  }
  return ORG_TYPE_CONFIGS.other;
}

/**
 * Get all fields for a person form based on organization type
 */
export function getPersonFields(orgType: OrgType | string | null): FieldConfig[] {
  const config = getOrgTypeConfig(orgType);
  return [...CORE_FIELDS, ...config.fields];
}

/**
 * Get the appropriate label for people based on organization type
 */
export function getPersonLabel(orgType: OrgType | string | null, plural = false): string {
  const config = getOrgTypeConfig(orgType);
  return plural ? config.personLabelPlural : config.personLabel;
}

/**
 * Get the appropriate label for groups based on organization type
 */
export function getGroupLabel(orgType: OrgType | string | null, plural = false): string {
  const config = getOrgTypeConfig(orgType);
  return plural ? config.groupLabelPlural : config.groupLabel;
}
