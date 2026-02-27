import { QueryResult } from 'pg';
import pool from '../database/connection';
import { Contact, IdentifyRequest, IdentifyResponse } from '../types';

export class ContactService {
  async findContactsByEmailOrPhone(
    email: string | undefined,
    phoneNumber: string | undefined
  ): Promise<Contact[]> {
    if (!email && !phoneNumber) {
      return [];
    }

    let query = `
      SELECT * FROM Contact 
      WHERE deletedAt IS NULL AND (
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (email) {
      params.push(email);
      conditions.push(`email = $${params.length}`);
    }

    if (phoneNumber) {
      params.push(phoneNumber);
      conditions.push(`phoneNumber = $${params.length}`);
    }

    query += conditions.join(' OR ') + ')';
    
    const result: QueryResult<Contact> = await pool.query(query, params);
    return result.rows;
  }

  async getAllLinkedContacts(contacts: Contact[]): Promise<Contact[]> {
    if (contacts.length === 0) return [];

    const primaryIds = new Set<number>();
    contacts.forEach(contact => {
      const primaryId = contact.linkedId || contact.id;
      primaryIds.add(primaryId);
    });

    const query = `
      SELECT * FROM Contact 
      WHERE deletedAt IS NULL 
      AND (id = ANY($1) OR linkedId = ANY($1))
      ORDER BY createdAt ASC
    `;
    
    const result: QueryResult<Contact> = await pool.query(query, [Array.from(primaryIds)]);
    return result.rows;
  }

  async createContact(
    email: string | undefined,
    phoneNumber: string | undefined,
    linkedId: number | null,
    linkPrecedence: 'primary' | 'secondary'
  ): Promise<Contact> {
    const query = `
      INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `;
    
    const result: QueryResult<Contact> = await pool.query(query, [
      email || null,
      phoneNumber || null,
      linkedId,
      linkPrecedence
    ]);
    
    return result.rows[0];
  }

  async updateContactToSecondary(contactId: number, newLinkedId: number): Promise<void> {
    const query = `
      UPDATE Contact 
      SET linkedId = $1, linkPrecedence = 'secondary', updatedAt = NOW()
      WHERE id = $2
    `;
    
    await pool.query(query, [newLinkedId, contactId]);
  }

  async updateLinkedContacts(oldPrimaryId: number, newPrimaryId: number): Promise<void> {
    const query = `
      UPDATE Contact 
      SET linkedId = $1, updatedAt = NOW()
      WHERE linkedId = $2
    `;
    
    await pool.query(query, [newPrimaryId, oldPrimaryId]);
  }

  async identifyContact(request: IdentifyRequest): Promise<IdentifyResponse> {
    const { email, phoneNumber } = request;

    if (!email && !phoneNumber) {
      throw new Error('At least one of email or phoneNumber must be provided');
    }

    const matchingContacts = await this.findContactsByEmailOrPhone(email, phoneNumber);

    if (matchingContacts.length === 0) {
      const newContact = await this.createContact(email, phoneNumber, null, 'primary');
      
      return this.buildResponse([newContact]);
    }

    let allContacts = await this.getAllLinkedContacts(matchingContacts);

    const needsNewContact = this.shouldCreateNewContact(allContacts, email, phoneNumber);

    if (needsNewContact) {
      const primary = allContacts.find(c => c.linkPrecedence === 'primary');
      const primaryId = primary ? primary.id : allContacts[0].id;

      const newContact = await this.createContact(email, phoneNumber, primaryId, 'secondary');
      allContacts.push(newContact);
    }

    const primaryContacts = allContacts.filter(c => c.linkPrecedence === 'primary');
    
    if (primaryContacts.length > 1) {
      primaryContacts.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateA.getTime() - dateB.getTime();
      });
      const oldestPrimary = primaryContacts[0];

      for (let i = 1; i < primaryContacts.length; i++) {
        const primaryToUpdate = primaryContacts[i];
        await this.updateContactToSecondary(primaryToUpdate.id, oldestPrimary.id);
        
        await this.updateLinkedContacts(primaryToUpdate.id, oldestPrimary.id);
        
        primaryToUpdate.linkedId = oldestPrimary.id;
        primaryToUpdate.linkPrecedence = 'secondary';
      }

      allContacts = await this.getAllLinkedContacts([oldestPrimary]);
    }

    return this.buildResponse(allContacts);
  }

  private shouldCreateNewContact(
    contacts: Contact[],
    email: string | undefined,
    phoneNumber: string | undefined
  ): boolean {
    const exactMatch = contacts.find(
      c => c.email === (email || null) && c.phoneNumber === (phoneNumber || null)
    );

    if (exactMatch) {
      return false;
    }

    const hasEmail = email !== undefined;
    const hasPhone = phoneNumber !== undefined;

    if (hasEmail && hasPhone) {
      const emailExists = contacts.some(c => c.email === email);
      const phoneExists = contacts.some(c => c.phoneNumber === phoneNumber);

      if (emailExists || phoneExists) {
        const bothExistTogether = contacts.some(
          c => c.email === email && c.phoneNumber === phoneNumber
        );
        return !bothExistTogether;
      }
    }

    return false;
  }

  private buildResponse(contacts: Contact[]): IdentifyResponse {
    if (contacts.length === 0) {
      throw new Error('No contacts found');
    }

    contacts.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });

    const primary = contacts.find(c => c.linkPrecedence === 'primary') || contacts[0];
    
    const emails: string[] = [];
    const phoneNumbers: string[] = [];
    const secondaryContactIds: number[] = [];

    if (primary.email) emails.push(primary.email);
    if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);

    contacts.forEach(contact => {
      if (contact.id !== primary.id) {
        if (contact.email && !emails.includes(contact.email)) {
          emails.push(contact.email);
        }
        if (contact.phoneNumber && !phoneNumbers.includes(contact.phoneNumber)) {
          phoneNumbers.push(contact.phoneNumber);
        }
        if (contact.linkPrecedence === 'secondary') {
          secondaryContactIds.push(contact.id);
        }
      }
    });

    return {
      contact: {
        primaryContatctId: primary.id,
        emails,
        phoneNumbers,
        secondaryContactIds
      }
    };
  }
}
