"use client";

import { Search, Bell, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-2">
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-backhub">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
        </div>
        <span className="text-xl font-bold tracking-tight text-gray-800">
          Back<span className="text-backhub">Hub</span>
        </span>
      </div>

      {/* Center: Search */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Search issues..."
          className="pl-9 text-sm"
        />
      </div>

      {/* Right: Actions + User */}
      <div className="flex items-center gap-4">
        <button className="relative text-gray-500 hover:text-gray-700">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-medium text-white">
            3
          </span>
        </button>
        <button className="text-gray-500 hover:text-gray-700">
          <Settings className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 pl-2">
          <div className="text-right">
            <p className="text-sm font-medium leading-tight text-gray-800">
              John Doe
            </p>
            <p className="text-xs leading-tight text-gray-500">ADMIN</p>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-amber-100 text-sm font-medium text-amber-700">
              JD
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
