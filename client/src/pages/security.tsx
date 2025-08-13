import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Lock, AlertTriangle, User, Activity, Download } from "lucide-react";

export default function Security() {
  const [activeTab, setActiveTab] = useState<"users" | "logs" | "compliance">("users");

  // Mock data
  const users = [
    {
      id: "user-1",
      name: "Marie Martin",
      email: "marie.martin@company.com",
      role: "Administrateur",
      status: "active",
      lastLogin: new Date("2024-02-15T10:30:00")
    },
    {
      id: "user-2",
      name: "Pierre Durand",
      email: "pierre.durand@company.com",
      role: "Valideur",
      status: "active",
      lastLogin: new Date("2024-02-14T14:15:00")
    }
  ];

  const auditLogs = [
    {
      id: "log-1",
      user: "Marie Martin",
      action: "Validation contrat",
      target: "CNT-2024-001",
      date: new Date("2024-02-15T11:00:00"),
      ip: "192.168.1.100"
    },
    {
      id: "log-2",
      user: "Pierre Durand",
      action: "Suppression document",
      target: "DOC-123",
      date: new Date("2024-02-14T15:30:00"),
      ip: "192.168.1.101"
    }
  ];

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 lg:hidden">
          <div className="flex items-center justify-between">
            <MobileNav />
            <h1 className="text-lg font-semibold">Sécurité & Conformité</h1>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" data-testid="security-main">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sécurité et conformité</h1>
              <p className="text-gray-600">Gestion des accès, audit et conformité RBAC</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.status === "active").length}
                  </div>
                  <p className="text-sm text-gray-600">Utilisateurs actifs</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {auditLogs.length}
                  </div>
                  <p className="text-sm text-gray-600">Actions aujourd'hui</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Shield className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">100%</div>
                  <p className="text-sm text-gray-600">Conformité RBAC</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle className="w-8 h-8 text-orange-500" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <p className="text-sm text-gray-600">Violations sécurité</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex space-x-4">
                    <Button 
                      variant={activeTab === "users" ? "default" : "ghost"}
                      onClick={() => setActiveTab("users")}
                      data-testid="tab-users"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Utilisateurs
                    </Button>
                    <Button 
                      variant={activeTab === "logs" ? "default" : "ghost"}
                      onClick={() => setActiveTab("logs")}
                      data-testid="tab-logs"
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Journal d'audit
                    </Button>
                    <Button 
                      variant={activeTab === "compliance" ? "default" : "ghost"}
                      onClick={() => setActiveTab("compliance")}
                      data-testid="tab-compliance"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Conformité
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-export-audit">
                    <Download className="w-4 h-4 mr-2" />
                    Exporter
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Content based on active tab */}
            {activeTab === "users" && (
              <Card>
                <CardHeader>
                  <CardTitle>Gestion des utilisateurs</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Dernière connexion</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="success">Actif</Badge>
                          </TableCell>
                          <TableCell>{formatDateTime(user.lastLogin)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">Modifier</Button>
                              <Button variant="ghost" size="sm" className="text-red-600">
                                <Lock className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {activeTab === "logs" && (
              <Card>
                <CardHeader>
                  <CardTitle>Journal d'audit</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Heure</TableHead>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Cible</TableHead>
                        <TableHead>Adresse IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                          <TableCell>{formatDateTime(log.date)}</TableCell>
                          <TableCell className="font-medium">{log.user}</TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {log.target}
                            </code>
                          </TableCell>
                          <TableCell className="text-gray-500">{log.ip}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {activeTab === "compliance" && (
              <Card>
                <CardHeader>
                  <CardTitle>État de conformité</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-6 h-6 text-green-500" />
                        <div>
                          <p className="font-medium">Séparation des rôles</p>
                          <p className="text-sm text-gray-600">Aucun utilisateur ne peut valider ses propres contrats</p>
                        </div>
                      </div>
                      <Badge variant="success">Conforme</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-6 h-6 text-green-500" />
                        <div>
                          <p className="font-medium">Traçabilité complète</p>
                          <p className="text-sm text-gray-600">Toutes les actions sont enregistrées et non modifiables</p>
                        </div>
                      </div>
                      <Badge variant="success">Conforme</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-6 h-6 text-green-500" />
                        <div>
                          <p className="font-medium">Contrôle d'accès RBAC</p>
                          <p className="text-sm text-gray-600">Permissions basées sur les rôles activées</p>
                        </div>
                      </div>
                      <Badge variant="success">Conforme</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}