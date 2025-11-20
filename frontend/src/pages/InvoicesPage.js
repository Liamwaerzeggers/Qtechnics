import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import { FileText, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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
      const projectsRes = await axios.get(`${API}/api/projects`, { withCredentials: true });
      const projects = projectsRes.data;
      
      let allInvoices = [];
      for (const project of projects) {
        try {
          const invoicesRes = await axios.get(`${API}/api/projects/${project.id}/customer-invoices`, { withCredentials: true });
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
          withCredentials: true,
          responseType: 'blob'
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
        { withCredentials: true }
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
            <div className="p-2 sm:p-3 rounded-xl" style={{ backgroundColor: '#DBEAFE' }}>
              <FileText size={24} className="sm:w-7 sm:h-7" style={{ color: '#1E40AF' }} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1E3A8A' }}>
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: '#1E40AF'}}></div>
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
                        <div className="font-semibold" style={{color: '#1E40AF'}}>
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
                        <button
                          onClick={() => handleDownloadPDF(invoice.id, invoice.invoice_number)}
                          className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                          style={{color: '#1E40AF'}}
                        >
                          <Download size={18} />
                          <span className="text-sm font-medium">PDF</span>
                        </button>
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
