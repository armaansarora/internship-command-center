import { Users } from 'lucide-react';
import { getContacts } from '@/lib/contacts';
import { ContactsTable } from '@/components/contacts/contacts-table';
import { ContactForm } from '@/components/contacts/contact-form';
import { EmptyState } from '@/components/shared/empty-state';

export default async function ContactsPage() {
  const contacts = await getContacts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Network
          </h1>
          {contacts.length > 0 && (
            <span className="rounded-full bg-primary/10 px-3 py-0.5 text-sm font-medium text-primary tabular-nums">
              {contacts.length}
            </span>
          )}
        </div>
        <ContactForm existingContacts={contacts} />
      </div>

      {/* Content */}
      {contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          variant="contacts"
          title="No contacts yet"
          description="Start building your professional network by adding your first contact."
        />
      ) : (
        <ContactsTable data={contacts} />
      )}
    </div>
  );
}
