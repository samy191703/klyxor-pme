import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, HelpCircle, Bell, User, ChevronDown } from "lucide-react";

export default function Header() {
  const [searchTerm, setSearchTerm] = useState("");
  const [environment, setEnvironment] = useState("production");

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Global Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Rechercher contrats, numéros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-80"
              data-testid="input-global-search"
            />
          </div>
          
          {/* Environment Selector */}
          <Select value={environment} onValueChange={setEnvironment}>
            <SelectTrigger className="w-[120px]" data-testid="select-environment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="development">Dev</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Help */}
          <Button variant="ghost" size="sm" data-testid="button-help">
            <HelpCircle className="w-5 h-5 text-gray-400" />
          </Button>
          
          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="sm" data-testid="button-notifications">
              <Bell className="w-5 h-5 text-gray-400" />
            </Button>
            <Badge className="absolute -top-1 -right-1 w-5 h-5 text-xs bg-red-500 text-white rounded-full flex items-center justify-center p-0">
              5
            </Badge>
          </div>
          
          {/* User Profile */}
          <div className="flex items-center space-x-2" data-testid="user-profile">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Admin User</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    </header>
  );
}
