"use client";

import { useState, useEffect } from "react";
import { Loader2, User, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getPersonLabel, getPersonFields } from "@/lib/org-schema";

interface Person {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  external_id: string | null;
  status: string;
  attributes?: Record<string, any> | null;
}

interface PersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: Person | null;
  orgId: string | null;
  onSuccess: () => void;
}

export function PersonDialog({
  open,
  onOpenChange,
  person,
  orgId,
  onSuccess,
}: PersonDialogProps) {
  const [loading, setLoading] = useState(false);
  const [orgType, setOrgType] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    external_id: "",
    status: "active",
    attributes: {} as Record<string, string>,
  });

  // Load organization type for contextual labels
  useEffect(() => {
    const loadOrgType = async () => {
      if (!orgId) return;
      try {
        const supabase = createClient();
        const { data: org } = await supabase
          .from("organizations")
          .select("org_type")
          .eq("id", orgId)
          .single();

        if (org && "org_type" in org) {
          setOrgType((org as { org_type?: string }).org_type ?? null);
        }
      } catch (e) {
        console.warn("Failed to load organization type for PersonDialog", e);
      }
    };

    if (open) {
      loadOrgType();
    }
  }, [orgId, open]);

  useEffect(() => {
    if (person) {
      setFormData({
        full_name: person.full_name,
        email: person.email || "",
        phone: person.phone || "",
        external_id: person.external_id || "",
        status: person.status,
        attributes: (person.attributes as Record<string, string>) || {},
      });
    } else {
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        external_id: "",
        status: "active",
        attributes: {},
      });
    }
  }, [person, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;

    setLoading(true);
    const supabase = createClient();

    try {
      if (person) {
        await (supabase as any)
          .from("people")
          .update({
            full_name: formData.full_name,
            email: formData.email || null,
            phone: formData.phone || null,
            external_id: formData.external_id || null,
            status: formData.status,
            attributes: formData.attributes,
          })
          .eq("id", person.id);
      } else {
        await (supabase as any)
          .from("people")
          .insert({
            org_id: orgId,
            full_name: formData.full_name,
            email: formData.email || null,
            phone: formData.phone || null,
            external_id: formData.external_id || null,
            status: formData.status,
            attributes: formData.attributes,
          });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const personLabel = getPersonLabel(orgType, false);
  const allFields = getPersonFields(orgType);
  const coreKeys = new Set(["full_name", "email", "phone"]);
  const extraFields = allFields.filter((field) => !coreKeys.has(field.key));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{person ? `Edit ${personLabel}` : `Add ${personLabel}`}</DialogTitle>
          <DialogDescription>
            {person
              ? `Update this ${personLabel.toLowerCase()}'s information.`
              : `Add a new ${personLabel.toLowerCase()} to your organization.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Full Name
              </label>
              <Input
                placeholder="Enter full name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email
              </label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Phone
              </label>
              <Input
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="label">Status</label>
              <div className="flex gap-3">
                {["active", "inactive"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData({ ...formData, status })}
                    className={cn(
                      "flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium capitalize transition-all",
                      formData.status === status
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {extraFields.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border">
                {extraFields.map((field) => {
                  const value = formData.attributes[field.key] ?? "";
                  if (field.type === "select") {
                    return (
                      <div key={field.key} className="space-y-2">
                        <label className="label text-sm font-medium">
                          {field.label}
                        </label>
                        <select
                          value={value}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              attributes: {
                                ...formData.attributes,
                                [field.key]: e.target.value,
                              },
                            })
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select {field.label.toLowerCase()}</option>
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  return (
                    <div key={field.key} className="space-y-2">
                      <label className="label text-sm font-medium">
                        {field.label}
                      </label>
                      <Input
                        type={field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
                        placeholder={field.placeholder}
                        value={value}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            attributes: {
                              ...formData.attributes,
                              [field.key]: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {person ? "Save Changes" : "Add Person"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
