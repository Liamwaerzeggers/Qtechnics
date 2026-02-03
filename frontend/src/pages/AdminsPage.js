import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Users, Plus, Trash2, Lock, Unlock, Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState({ open: false, admin: null });
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${API}/admins`, { withCredentials: true });
      setAdmins(response.data);
    } catch (error) {
      console.error('Failed to fetch admins:', error);
      toast.error('Kon beheerders niet laden');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.username || !formData.email || !formData.password) {
      toast.error('Vul alle velden in');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 karakters zijn');
      return;
    }

    try {
      const response = await axios.post(`${API}/admins`, formData, { withCredentials: true });
      
      // Send email with account details
      const subject = 'Je beheerder account bij Q Technics';
      const body = `Hallo ${formData.name},

Je account is aangemaakt! Je kunt nu inloggen op het Q Technics platform.

🔐 INLOGGEGEVENS:
Gebruikersnaam: ${formData.username}
Wachtwoord: ${formData.password}

📱 LOGIN URL:
${window.location.origin}

BELANGRIJK: Bewaar deze email veilig. Je hebt deze gegevens nodig om in te loggen.

Wat kun je doen met je account?
✅ Projecten bekijken
✅ Werkbonnen invullen
✅ Materiaalgebruik registreren

Bij vragen kun je contact opnemen met je beheerder.

Met vriendelijke groet,
Q Technics`;

      const mailtoLink = `mailto:${formData.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
      
      toast.success('Beheerder toegevoegd! Email wordt voorbereid... 👷');
      setIsDialogOpen(false);
      setFormData({ name: '', username: '', email: '', password: '' });
      fetchAdmins();
    } catch (error) {
      console.error('Failed to create worker:', error);
      toast.error(error.response?.data?.detail || 'Kon beheerder niet toevoegen');
    }
  };

  const handleDelete = async (workerId, workerName) => {
    if (!window.confirm(`Weet je zeker dat je ${workerName} wilt verwijderen?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/admins/${workerId}`, { withCredentials: true });
      toast.success('Beheerder verwijderd');
      fetchAdmins();
    } catch (error) {
      console.error('Failed to delete worker:', error);
      toast.error('Kon beheerder niet verwijderen');
    }
  };

  const handleToggleStatus = async (workerId) => {
    try {
      const response = await axios.post(`${API}/admins/${workerId}/toggle`, {}, { withCredentials: true });
      toast.success(response.data.is_active ? 'Beheerder geactiveerd' : 'Beheerder gedeactiveerd');
      fetchAdmins();
    } catch (error) {
      console.error('Failed to toggle status:', error);
      toast.error('Kon status niet wijzigen');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin" size={48} style={{color: '#500000'}} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl" style={{backgroundColor: '#f5e6e6'}}>
              <Users size={28} style={{color: '#500000'}} />
            </div>
            <div>
              <h1 className="text-4xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif', color: '#500000'}}>
                Beheerders
              </h1>
              <p className="text-sm" style={{color: '#64748B'}}>
                Beheer beheerder accounts met volledige toegang
              </p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button style={{backgroundColor: '#500000'}}>
                <Plus className="mr-2" size={20} />
                Nieuwe Beheerder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Beheerder Toevoegen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Naam *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Jan Jansen"
                    required
                  />
                </div>

                <div>
                  <Label>Gebruikersnaam *</Label>
                  <Input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    placeholder="admin123"
                    required
                  />
                </div>

                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="jan@example.com"
                    required
                  />
                </div>

                <div>
                  <Label>Wachtwoord * (min. 6 karakters)</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm" style={{color: '#500000'}}>
                    <strong>ℹ️ Let op:</strong> Beheerdernen kunnen:
                  </p>
                  <ul className="text-sm mt-2 space-y-1" style={{color: '#64748B'}}>
                    <li>✅ Volledige toegang tot alle features</li>
                    <li>✅ Leads, offertes, projecten beheren</li>
                    <li>✅ Facturen en financiën inzien</li>
                  </ul>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuleren
                  </Button>
                  <Button type="submit" style={{backgroundColor: '#500000'}}>
                    Toevoegen
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Workers List */}
        {admins.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users size={48} className="mx-auto mb-4" style={{color: '#94A3B8'}} />
              <p className="text-lg font-medium mb-2" style={{color: '#64748B'}}>
                Nog geen beheerdernen toegevoegd
              </p>
              <p className="text-sm mb-4" style={{color: '#94A3B8'}}>
                Voeg je eerste beheerder toe om te beginnen
              </p>
              <Button onClick={() => setIsDialogOpen(true)} style={{backgroundColor: '#500000'}}>
                <Plus className="mr-2" size={20} />
                Eerste Beheerder Toevoegen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {admins.map((worker) => (
              <Card key={worker.id} className="relative group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1" style={{color: '#3a190b'}}>
                        {worker.name}
                      </h3>
                      <p className="text-sm" style={{color: '#64748B'}}>
                        {worker.email}
                      </p>
                      <p className="text-xs mt-1" style={{color: '#94A3B8'}}>
                        ID: {worker.id}
                      </p>
                    </div>
                    
                    <div className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      🔐 Admin
                    </div>
                  </div>

                  <div className="text-xs mb-4" style={{color: '#94A3B8'}}>
                    Toegevoegd: {new Date(worker.created_at).toLocaleDateString('nl-NL')}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(worker.id, worker.name)}
                      className="hover:bg-red-50 hover:text-red-600"
                      title="Verwijderen"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3" style={{color: '#3a190b'}}>
              📝 Beheerder Login
            </h3>
            <div className="space-y-2 text-sm" style={{color: '#64748B'}}>
              <p>
                <strong>Login URL voor beheerders:</strong> Beheerders kunnen inloggen via de "Werkman Login" pagina met hun email en wachtwoord.
              </p>
              <p>
                <strong>Toegang:</strong> Beheerders hebben volledige toegang tot het platform: leads, offertes, projecten, facturen, financiën, materialen, kalender.
              </p>
              <p>
                <strong>Verschil met Google OAuth:</strong> Deze beheerders loggen in met email/wachtwoord in plaats van Google OAuth, maar hebben dezelfde rechten.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
