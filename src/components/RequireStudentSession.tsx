import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getActiveStudent } from '@/lib/session';

/** Blocks lesson routes until a student session exists. */
const RequireStudentSession: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(!!getActiveStudent());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background subtle-stars flex items-center justify-center">
        <p className="text-muted-foreground animate-fade-in">Loading…</p>
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/student-login" replace />;
  }

  return <>{children}</>;
};

export default RequireStudentSession;
