import { Contact, ParsedContact } from '@/types'

/**
 * Mail Merge Engine
 * Replaces placeholders like {{name}}, {{email}}, etc. with actual contact data
 */
export class MailMergeEngine {
  private template: string
  private subjectTemplate: string

  constructor(template: string, subject: string = '') {
    this.template = template
    this.subjectTemplate = subject
  }

  /**
   * Replace placeholders in text with contact data
   * Supports {{field}} and {{custom_field.name}} syntax
   */
  private replacePlaceholders(text: string, contact: ParsedContact): string {
    let result = text

    // Replace standard fields
    result = result.replace(/\{\{name\}\}/gi, contact.name || '')
    result = result.replace(/\{\{email\}\}/gi, contact.email || '')

    // Replace custom fields
    Object.entries(contact.custom_fields).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi')
      result = result.replace(regex, value || '')
    })

    return result
  }

  /**
   * Generate personalized email content for a single contact
   */
  public generateEmail(contact: ParsedContact): { subject: string; body: string } {
    return {
      subject: this.replacePlaceholders(this.subjectTemplate, contact),
      body: this.replacePlaceholders(this.template, contact),
    }
  }

  /**
   * Generate personalized emails for multiple contacts
   */
  public generateBulkEmails(contacts: ParsedContact[]): Array<{
    contact: ParsedContact
    subject: string
    body: string
  }> {
    return contacts.map(contact => ({
      contact,
      ...this.generateEmail(contact),
    }))
  }

  /**
   * Preview email for a single contact (for UI preview)
   */
  public preview(contact: ParsedContact): { subject: string; body: string } {
    return this.generateEmail(contact)
  }

  /**
   * Extract all unique placeholders from template
   */
  public static extractPlaceholders(template: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g
    const placeholders: string[] = []
    let match

    while ((match = regex.exec(template)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1])
      }
    }

    return placeholders
  }

  /**
   * Validate that all placeholders have corresponding data
   */
  public validateTemplate(availableFields: string[]): { valid: boolean; missingFields: string[] } {
    const placeholders = MailMergeEngine.extractPlaceholders(this.template + ' ' + this.subjectTemplate)
    const missingFields = placeholders.filter(
      field => !availableFields.includes(field.toLowerCase())
    )

    return {
      valid: missingFields.length === 0,
      missingFields,
    }
  }
}

/**
 * Parse contact data from database format
 */
export function parseContactData(contact: Contact): ParsedContact {
  return {
    email: contact.email,
    name: contact.name,
    custom_fields: contact.custom_fields || {},
  }
}

/**
 * Email validation regex
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Detect email column from CSV headers
 */
export function detectEmailColumn(headers: string[]): string | null {
  const emailPatterns = ['email', 'e-mail', 'mail', 'email_address', 'emailaddress']
  
  for (const header of headers) {
    const normalized = header.toLowerCase().replace(/[_-]/g, '')
    if (emailPatterns.some(pattern => normalized.includes(pattern))) {
      return header
    }
  }
  
  return null
}

/**
 * Detect name column from CSV headers
 */
export function detectNameColumn(headers: string[]): string | null {
  const namePatterns = ['name', 'first_name', 'firstname', 'first name', 'full_name', 'fullname', 'full name']
  
  for (const header of headers) {
    const normalized = header.toLowerCase().replace(/[_-]/g, '')
    if (namePatterns.some(pattern => normalized.includes(pattern))) {
      return header
    }
  }
  
  return null
}
