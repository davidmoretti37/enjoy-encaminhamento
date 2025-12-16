/**
 * Company Vagas Page - Redirects to CompanyJobs
 *
 * This page redirects to /company/jobs where the actual vagas management is done
 */

import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function CompanyVagasPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to the actual company jobs page
    setLocation('/company/jobs');
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-600">Redirecionando...</p>
    </div>
  );
}
