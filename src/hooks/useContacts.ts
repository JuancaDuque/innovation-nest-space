import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Contact {
  contact_id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  email: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export const useContacts = (companyId?: string) => {
  return useQuery({
    queryKey: ["contacts", companyId],
    queryFn: async () => {
      let query = supabase
        .from("contacts")
        .select("*")
        .order("last_name");

      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Contact[];
    },
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Omit<Contact, "contact_id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("contacts")
        .insert(contact)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create contact: ${error.message}`);
    },
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contact_id, ...updates }: Partial<Contact> & { contact_id: string }) => {
      const { data, error } = await supabase
        .from("contacts")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("contact_id", contact_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contact: ${error.message}`);
    },
  });
};
