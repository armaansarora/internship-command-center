// @ts-nocheck
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createContact, updateContact } from '@/lib/contact-actions';
import type { ContactWithWarmth } from '@/lib/contacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().min(1, 'Company is required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  relationshipType: z.enum(['recruiter', 'referral', 'alumni', 'cold_contact']),
  introducedBy: z.string().optional(),
  notes: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ContactFormProps {
  contact?: ContactWithWarmth;
  existingContacts?: ContactWithWarmth[];
}

export function ContactForm({ contact, existingContacts = [] }: ContactFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEditing = !!contact;

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: contact?.name || '',
      company: contact?.company || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
      role: contact?.role || '',
      relationshipType: contact?.relationshipType || 'cold_contact',
      introducedBy: contact?.introducedBy ? String(contact.introducedBy) : '',
      notes: contact?.notes || '',
    },
  });

  function onSubmit(values: ContactFormValues) {
    startTransition(async () => {
      const formData = new FormData();
      if (isEditing && contact) {
        formData.set('id', String(contact.id));
      }
      formData.set('name', values.name);
      formData.set('company', values.company);
      if (values.email) formData.set('email', values.email);
      if (values.phone) formData.set('phone', values.phone);
      if (values.role) formData.set('role', values.role);
      formData.set('relationshipType', values.relationshipType);
      if (values.introducedBy) formData.set('introducedBy', values.introducedBy);
      if (values.notes) formData.set('notes', values.notes);

      const result = isEditing
        ? await updateContact(formData)
        : await createContact(formData);

      if ('error' in result) {
        toast.error('Failed to save contact', { description: result.error, id: 'contact-save' });
      } else {
        toast.success(isEditing ? 'Contact updated' : 'Contact added', { id: 'contact-save' });
        form.reset();
        setOpen(false);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Contact
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Contact' : 'Add Contact'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update contact information.'
              : 'Add a new contact to your network.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...form.register('name')} placeholder="John Smith" />
            {form.formState.errors.name && (
              <p className="text-xs text-red-400">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company *</Label>
            <Input id="company" {...form.register('company')} placeholder="Acme Corp" />
            {form.formState.errors.company && (
              <p className="text-xs text-red-400">{form.formState.errors.company.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register('email')} placeholder="john@acme.com" />
            {form.formState.errors.email && (
              <p className="text-xs text-red-400">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...form.register('phone')} placeholder="(555) 123-4567" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input id="role" {...form.register('role')} placeholder="Recruiter, VP, etc." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationshipType">Relationship Type *</Label>
            <Select
              value={form.watch('relationshipType')}
              onValueChange={(value) =>
                form.setValue('relationshipType', value as ContactFormValues['relationshipType'])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recruiter">Recruiter</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="alumni">Alumni</SelectItem>
                <SelectItem value="cold_contact">Cold Contact</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {existingContacts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="introducedBy">Introduced By</Label>
              <Select
                value={form.watch('introducedBy') || ''}
                onValueChange={(value) => form.setValue('introducedBy', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {existingContacts
                    .filter((c) => c.id !== contact?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} ({c.company})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Saving...' : isEditing ? 'Update Contact' : 'Add Contact'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
