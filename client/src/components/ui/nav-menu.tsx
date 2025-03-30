import React from 'react';
import { useLocation, Link } from 'wouter';
import { Home, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export const NavMenu: React.FC = () => {
  const [location] = useLocation();

  return (
    <div className="flex justify-end items-center space-x-4 px-6 py-2 bg-black/50 backdrop-blur-md">
      <div className="flex mr-auto">
        <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-400">
          Hardstyle Kick Generator
        </span>
      </div>
      
      <Link href="/"
        className={cn(
          "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
          location === "/" 
            ? "bg-green-600/20 text-green-400" 
            : "text-gray-300 hover:bg-gray-800 hover:text-green-400"
        )}
      >
        <Home className="h-4 w-4 mr-2" />
        <span>Home</span>
      </Link>
      
      <a 
        href="https://jessenth.com" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-blue-400 transition-colors"
      >
        <Info className="h-4 w-4 mr-2" />
        <span>About</span>
      </a>
    </div>
  );
};