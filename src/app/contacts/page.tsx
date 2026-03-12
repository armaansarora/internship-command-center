import { getContacts } from '@/lib/contacts';
import { ContactsTable } from '@/components/contacts/contacts-table';
import { ContactForm } from '@/components/contacts/contact-form';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Users } from 'lucide-react';

export default async function ContactsPage() {
  const contacts = await getContacts();

  return (
    <div className="space-y-0">
      <PageHeader
        title="Contacts"
        subtitle={`${contacts.length} networking connection${contacts.length !== 1 ? 's' : ''}`}
      >
        <ContactForm existingContacts={contacts} />
      </PageHeader>

      <div className="p-4 md:p-6 space-y-6">
        {contacts.length > 0 ? (
          <ContactsTable data={contacts} />
        ) : (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Start building your network by adding recruiters, referrals, and alumni connections."
            action={{ label: 'Add Contact', href: '/contacts' }}
            variant="contacts"
          />
        )}
      </div>
    </div>
  );
}
