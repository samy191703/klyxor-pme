import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const [location] = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (location !== displayLocation) {
      setIsTransitioning(true);
      
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setIsTransitioning(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [location, displayLocation]);

  return (
    <div
      className={`
        transition-all duration-300 ease-in-out
        ${isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
    >
      {children}
    </div>
  );
}