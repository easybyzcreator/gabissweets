import React from 'react';
import { Settings } from '../types';
import ChefCourses from './ChefCourses';

interface AdminSuppliesProps {
  settings: Settings;
}

export default function AdminSupplies({ settings }: AdminSuppliesProps) {
  return <ChefCourses settings={settings} />;
}
