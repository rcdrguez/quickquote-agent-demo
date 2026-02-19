import { v4 as uuidv4 } from 'uuid';
import { all, get, run } from '../db.js';
import type { CustomerPayload } from '../schemas.js';

export interface Customer {
  id: string;
  name: string;
  rnc?: string;
  email?: string;
  phone?: string;
  createdAt: string;
}

export async function listCustomers() {
  return all<Customer>('SELECT * FROM customers ORDER BY datetime(createdAt) DESC');
}

export async function createCustomer(input: CustomerPayload) {
  const customer: Customer = {
    id: uuidv4(),
    name: input.name,
    rnc: input.rnc,
    email: input.email,
    phone: input.phone,
    createdAt: new Date().toISOString()
  };

  await run('INSERT INTO customers (id, name, rnc, email, phone, createdAt) VALUES (?, ?, ?, ?, ?, ?)', [
    customer.id,
    customer.name,
    customer.rnc ?? null,
    customer.email ?? null,
    customer.phone ?? null,
    customer.createdAt
  ]);

  return customer;
}

export async function updateCustomer(id: string, input: CustomerPayload) {
  await run('UPDATE customers SET name = ?, rnc = ?, email = ?, phone = ? WHERE id = ?', [
    input.name,
    input.rnc ?? null,
    input.email ?? null,
    input.phone ?? null,
    id
  ]);

  return get<Customer>('SELECT * FROM customers WHERE id = ?', [id]);
}

export async function findCustomerByNameOrId(customerNameOrId: string) {
  const byId = await get<Customer>('SELECT * FROM customers WHERE id = ?', [customerNameOrId]);
  if (byId) return byId;

  return get<Customer>('SELECT * FROM customers WHERE lower(name) = lower(?)', [customerNameOrId]);
}
