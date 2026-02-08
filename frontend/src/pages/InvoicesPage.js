import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { FileText, Download, CheckCircle, Clock, AlertCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('session_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const API = process.env.REACT_APP_BACKEND_URL;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllInvoices();
  }, []);

  const fetchAllInvoices = async () => {
    try {
      setLoading(true);
      // We need to get all projects first, then their invoices
      const projectsRes = await axios.get(`${API}/api/projects`, { headers: getAuthHeaders() });
      const projects = projectsRes.data;
      
      let allInvoices = [];
      for (const project of projects) {
        try {
          const invoicesRes = await axios.get(`${API}/api/projects/${project.id}/customer-invoices`, { headers: getAuthHeaders() });
          const projectInvoices = invoicesRes.data.map(inv => ({
            ...inv,
            projectName: project.name,
            projectId: project.id
          }));
          allInvoices = [...allInvoices, ...projectInvoices];
        } catch (err) {
          console.error(`Failed to fetch invoices for project ${project.id}`, err);
        }
      }
      
      // Sort by invoice date descending
      allInvoices.sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date));
      setInvoices(allInvoices);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Kon facturen niet laden');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      const response = await axios.get(
        `${API}/api/invoices/${invoiceId}/pdf`,
        { 
          headers: getAuthHeaders(), responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `factuur_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF gedownload');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Kon PDF niet downloaden');
    }
  };

  const handleSendEmail = async (invoice) => {
    try {
      // Get customer email from project/lead
      const projectRes = await axios.get(`${API}/api/projects/${invoice.projectId}`, { headers: getAuthHeaders() });
      const project = projectRes.data;
      
      const quoteRes = await axios.get(`${API}/api/quotes/${project.quote_id}`, { headers: getAuthHeaders() });
      const quote = quoteRes.data;
      
      const leadRes = await axios.get(`${API}/api/leads/${quote.lead_id}`, { headers: getAuthHeaders() });
      const customerEmail = leadRes.data.email;
      const customerName = leadRes.data.name;
      
      // First, download the PDF
      toast.info('PDF wordt gedownload...');
      const pdfResponse = await axios.get(
        `${API}/api/invoices/${invoice.id}/pdf`,
        { 
          headers: getAuthHeaders(), responseType: 'blob'
        }
      );
      
      const pdfUrl = window.URL.createObjectURL(new Blob([pdfResponse.data]));
      const pdfLink = document.createElement('a');
      pdfLink.href = pdfUrl;
      pdfLink.setAttribute('download', `factuur_${invoice.invoice_number}.pdf`);
      document.body.appendChild(pdfLink);
      pdfLink.click();
      pdfLink.remove();
      
      // Generate Belgian bank payment link with OGM
      const ogm = invoice.payment_reference || '';
      const amount = invoice.total_incl_vat.toFixed(2);
      
      // Prepare email with OGM reference and payment link
      const subject = `Factuur ${invoice.invoice_number} - Q Technics`;
      const body = `Beste ${customerName},

Hierbij ontvangt u factuur ${invoice.invoice_number} voor project "${invoice.projectName}".

📄 FACTUUR BIJLAGE:
De PDF is automatisch gedownload. Voeg deze toe als bijlage aan deze email.

💰 BETAALINFORMATIE:
Factuurbedrag: €${amount}
Vervaldatum: ${new Date(invoice.due_date).toLocaleDateString('nl-NL')}

🏦 GESTRUCTUREERDE MEDEDELING (verplicht):
${ogm}

BELANGRIJK: Gebruik deze gestructureerde mededeling bij uw overschrijving zodat de betaling automatisch wordt verwerkt.

💳 DIRECT BETALEN:
Kopieer onderstaande link en plak in uw browser om direct te betalen via uw bank:
https://www.ing.be/mijnrekeningen/betalen?bedrag=${amount}&mededeling=${encodeURIComponent(ogm)}

(Dit werkt voor de meeste Belgische banken. Gebruik anders de mobiele banking app en kopieer de gestructureerde mededeling handmatig.)

Heeft u vragen? Neem gerust contact met ons op.

Met vriendelijke groet,
Q Technics`;

      // Open mailto link
      const mailtoLink = `mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
      
      toast.success(`✅ PDF gedownload en email voorbereid voor ${customerEmail}`);
    } catch (error) {
      console.error('Failed to prepare email:', error);
      toast.error('Kon email niet voorbereiden');
    }
  };

  const togglePaymentStatus = async (invoice) => {
    const newStatus = invoice.payment_status === 'paid' ? 'unpaid' : 'paid';
    const paidDate = newStatus === 'paid' ? new Date().toISOString() : null;
    
    try {
      await axios.put(
        `${API}/api/invoices/${invoice.id}`,
        { 
          payment_status: newStatus,
          paid_date: paidDate
        },
        { headers: getAuthHeaders() }
      );
      toast.success(newStatus === 'paid' ? 'Factuur gemarkeerd als betaald' : 'Factuur gemarkeerd als onbetaald');
      fetchAllInvoices();
    } catch (error) {
      console.error('Failed to update payment status:', error);
      toast.error('Kon betaalstatus niet bijwerken');
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'paid') return <CheckCircle size={20} style={{color: '#10B981'}} />;
    if (status === 'overdue') return <AlertCircle size={20} style={{color: '#EF4444'}} />;
    return <Clock size={20} style={{color: '#F59E0B'}} />;
  };

  const getStatusText = (status) => {
    if (status === 'paid') return 'Betaald';
    if (status === 'overdue') return 'Achterstallig';
    return 'Onbetaald';
  };

  const getMilestoneText = (milestone) => {
    const names = {
      "10_approval": "10% Akkoord",
      "40_before_start": "40% Voor Start",
      "40_completion": "40% Oplevering",
      "10_satisfaction": "10% Tevredenheid"
    };
    return names[milestone] || milestone;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-3 rounded-xl" style={{ backgroundColor: '#f5e6e6' }}>
              <FileText size={24} className="sm:w-7 sm:h-7" style={{ color: '#500000' }} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#3a190b' }}>
                Facturen
              </h1>
              <p className="text-sm" style={{ color: '#64748B', fontFamily: 'Inter, sans-serif' }}>
                Overzicht van alle uitgegeven facturen
              </p>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: '#500000'}}></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText size={48} className="mx-auto mb-4" style={{ color: '#94A3B8' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#64748B' }}>Nog geen facturen</h3>
            <p style={{ color: '#94A3B8' }}>Maak facturen aan via de project pagina's</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead style={{backgroundColor: '#F8FAFC'}}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#64748B'}}>
                      Factuur Nr.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#64748B'}}>
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#64748B'}}>
                      Milestone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#64748B'}}>
                      Bedrag
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#64748B'}}>
                      Datum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#64748B'}}>
                      Vervaldatum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#64748B'}}>
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#64748B'}}>
                      Acties
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold" style={{color: '#500000'}}>
                          {invoice.invoice_number}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div 
                          className="font-medium cursor-pointer hover:underline" 
                          style={{color: '#1E293B'}}
                          onClick={() => navigate(`/projects/${invoice.projectId}`)}
                        >
                          {invoice.projectName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm" style={{color: '#64748B'}}>
                          {getMilestoneText(invoice.milestone)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold" style={{color: '#1E293B'}}>
                          €{invoice.total_incl_vat.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{color: '#64748B'}}>
                        {new Date(invoice.invoice_date).toLocaleDateString('nl-NL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{color: '#64748B'}}>
                        {new Date(invoice.due_date).toLocaleDateString('nl-NL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => togglePaymentStatus(invoice)}
                          className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-colors hover:opacity-80"
                          style={{
                            backgroundColor: invoice.payment_status === 'paid' ? '#D1FAE5' : '#FEF3C7',
                            color: invoice.payment_status === 'paid' ? '#065F46' : '#92400E'
                          }}
                        >
                          {getStatusIcon(invoice.payment_status)}
                          <span>{getStatusText(invoice.payment_status)}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPDF(invoice.id, invoice.invoice_number)}
                            className="hover:bg-red-50"
                            style={{color: '#500000'}}
                            title="Download PDF"
                          >
                            <Download size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendEmail(invoice)}
                            className="hover:bg-green-50"
                            style={{color: '#059669'}}
                            title="Verstuur per email"
                          >
                            <Mail size={18} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
