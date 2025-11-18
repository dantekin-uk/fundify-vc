import React from 'react';
import { useOrg } from '../context/OrgContext';

export default function AdminOnly({ children }) {
  const { role } = useOrg();
  if (role === 'admin') return <>{children}</>;
  return null;
}
